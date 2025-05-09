import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";

import * as Util from "@shared/util";
import { Layout, equals, hash, neighborsRange, Hex } from "@shared/hex";
import * as Vector2 from "@shared/vector2";
import { ClientTile, Selection, SelectionType, ZIndices } from "./types";
import { Building, Group, Tile } from "@shared/objects";
import { convertToSpriteName, Hashtable } from "@shared/util";
import { useStore } from "@/lib/state";
import * as PlayerRelation from "@shared/relation";
import {
  getBuildingSprite,
  getGroupSprite,
  getTerrainTexture,
} from "./sprites";
import { Socket } from "socket.io-client";
import {
  Application,
  Assets,
  Container,
  FederatedPointerEvent,
  Graphics,
  Point,
  Rectangle,
  Sprite,
  Text,
} from "pixi.js";

export class Engine {
  private viewport: Viewport;
  private readonly HEX_SIZE: number = 80;
  private layout: Layout = new Layout(
    Layout.pointy,
    Vector2.create(this.HEX_SIZE, this.HEX_SIZE),
    Vector2.create(0, 0)
  );
  private initialFocusSet: boolean = false;
  private readonly GLOW_FILTER: GlowFilter = new GlowFilter({
    distance: 30,
    outerStrength: 2,
    color: 0x000000,
  });
  private uid =
    new URLSearchParams(window.location.search).get("user") || "test";
  private app: Application;
  private socket: Socket;
  private debugMode: boolean = false;
  private debugContainer: Container | null = null;
  private isDragging: boolean = false;
  private animationFrameIds: Map<string, number> = new Map();
  private selectedSprite: Sprite | null = null;
  constructor(app: Application) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const viewport = new Viewport({
      screenWidth,
      screenHeight,
      passiveWheel: false,
      disableOnContextMenu: true,
      events: app.renderer.events,
    });
    this.viewport = viewport;
    // activate plugins
    viewport
      .clampZoom({
        maxScale: 2,
        minScale: 0.2,
      })
      .drag()
      .pinch()
      .wheel()
      .decelerate();

    app.stage.addChild(viewport);
    this.app = app;
    this.socket = useStore.getState().socket;

    this.viewport.sortableChildren = true;

    this.viewport.on("click", () => {
      this.viewport.plugins.remove("follow");
    });

    this.viewport.on("drag-start", () => {
      this.isDragging = true;
    });

    this.viewport.on("drag-end", () => {
      this.isDragging = false;
    });

    window.addEventListener("keyup", this.handleKeyUp, false);
    window.addEventListener("resize", this.resize, false);
    this.socket.on("gamestate tiles", this.handleTilesUpdate);
    this.socket.on("gamestate group", this.handleGroupUpdate);
    this.socket.on("gamestate groups", this.handleGroupsUpdate);
    this.socket.on("gamestate buildings", this.handleBuildingsUpdate);

    this.requestTiles(this.socket);
    if (import.meta.env.DEV) {
      this.toggleDebugMode();
    }

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.initialFocusSet = false;
      });
    }
  }

  destroy(): void {
    // Cancel all animations
    this.animationFrameIds.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    this.animationFrameIds.clear();

    // Clear selection state
    this.clearSelection();

    // Remove event listeners
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("resize", this.resize);

    // Remove socket listeners
    this.socket.off("gamestate tiles", this.handleTilesUpdate);
    this.socket.off("gamestate group", this.handleGroupUpdate);
    this.socket.off("gamestate groups", this.handleGroupsUpdate);
    this.socket.off("gamestate buildings", this.handleBuildingsUpdate);

    // Clean up viewport and its listeners
    if (this.viewport) {
      this.viewport.removeAllListeners();
      this.app.stage.removeChild(this.viewport);
      this.viewport.destroy();
    }
  }

  private resize = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    this.viewport.resize(screenWidth, screenHeight);
  };

  private requestTiles = (socket: Socket) => {
    socket.emit("request tiles");
  };

  private handleGroupUpdate = (group: Group) => {
    const { world, setWorld } = useStore.getState();
    if (world.groups[group.id]) {
      // Update existing group
      setWorld({
        ...world,
        groups: {
          ...world.groups,
          [group.id]: group,
        },
      });
    } else {
      // New group
      setWorld({
        ...world,
        groups: {
          ...world.groups,
          [group.id]: group,
        },
      });
    }
    this.updateScenegraphGroup(group, this.uid);
    this.updateSelection();
  };

  private handleGroupsUpdate = (groups: Hashtable<Group>) => {
    const { world, setWorld } = useStore.getState();
    const newGroups: Hashtable<Group> = {};
    const visitedOldGroups: Hashtable<boolean> = {};
    let needsTileUpdate = false;

    // We no longer need to worry about selection state since updateScenegraphGroup handles it
    // Each group will maintain its own selection state properly

    Object.values(groups).forEach((receivedGroup) => {
      const oldGroup = world.groups[receivedGroup.id];
      visitedOldGroups[receivedGroup.id] = true;

      if (
        !oldGroup ||
        !equals(oldGroup.pos, receivedGroup.pos) ||
        oldGroup.spotting !== receivedGroup.spotting
      ) {
        this.updateScenegraphGroup(receivedGroup, this.uid);
        needsTileUpdate = true;
      }

      if (
        !oldGroup &&
        receivedGroup.owner !== this.uid &&
        world.playerRelations[
          PlayerRelation.hash(receivedGroup.owner, this.uid)
        ] === undefined
      ) {
        this.socket.emit("request relation", {
          id1: receivedGroup.owner,
          id2: this.uid,
        });
      }

      newGroups[receivedGroup.id] = receivedGroup;
    });

    // Handle groups that no longer exist
    Object.keys(world.groups).forEach((id) => {
      if (!visitedOldGroups[id]) {
        this.removeItem(parseInt(id));
        needsTileUpdate = true;
      }
    });

    setWorld({
      ...world,
      groups: newGroups,
    });

    if (needsTileUpdate) {
      this.requestTiles(this.socket);
    }
  };

  private handleBuildingsUpdate = (buildings: Hashtable<Building>) => {
    const { world, setWorld } = useStore.getState();
    const newBuildings: Hashtable<Building> = {};
    const visitedOldBuildings: Hashtable<boolean> = {};

    Object.values(buildings).forEach((building) => {
      visitedOldBuildings[building.id] = true;
      newBuildings[building.id] = building;

      // Only update scenegraph if it's a new building
      if (!world.buildings[building.id]) {
        this.updateScenegraphBuilding(building);
      }
    });

    // Remove buildings that are no longer present
    Object.keys(world.buildings).forEach((id) => {
      if (!visitedOldBuildings[id]) {
        this.removeItem(parseInt(id));
      }
    });

    setWorld({
      ...world,
      buildings: newBuildings,
    });
  };

  private handleTilesUpdate = (tiles: Util.Hashtable<ClientTile>) => {
    const { world, setWorld } = useStore.getState();
    const visibleHexes: Hashtable<Hex> = {};

    // Determine visible hexes based on groups and buildings
    Object.values(world.groups).forEach((group) => {
      neighborsRange(group.pos, group.spotting).forEach((hex) => {
        visibleHexes[hash(hex)] = hex;
      });
    });

    // Fixed building.pos to building.position
    Object.values(world.buildings).forEach((building) => {
      neighborsRange(building.position, building.spotting).forEach((hex) => {
        visibleHexes[hash(hex)] = hex;
      });
    });

    // Add new tiles to world
    setWorld({
      ...world,
      tiles: {
        ...world.tiles,
        ...tiles,
      },
    });

    // Update visibility and render tiles
    Object.values(world.tiles).forEach((tile: Tile) => {
      const cTile = tile as ClientTile;
      const oldVisibility = cTile.visible;
      cTile.visible = visibleHexes[hash(tile.hex)] !== undefined;

      if (oldVisibility !== cTile.visible) {
        this.updateScenegraphTile(cTile);
      }
    });
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    switch (event.key) {
      case "+":
        this.zoomIn();
        break;
      case "-":
        this.zoomOut();
        break;
      case "/":
        this.resetZoom();
        break;
      case "r":
      case "R":
        this.centerViewport();
        break;
      case "d":
      case "D":
        this.toggleDebugMode();
        break;
      case "s":
        this.viewport.dirty = true;
        break;
      default:
        break;
    }
  };

  /**
   * Clear any existing selection highlighting
   */
  private clearSelection(): void {
    if (this.selectedSprite) {
      this.selectedSprite.filters = [];
      this.selectedSprite = null;
    }
  }

  updateSelection(): void {
    const { selection } = useStore.getState();

    // Clear previous selection
    this.clearSelection();

    if (selection.id === undefined) {
      return;
    }

    let prefix = "";
    switch (selection.type) {
      case SelectionType.Group:
        prefix = "g";
        break;
      case SelectionType.Building:
        prefix = "b";
        break;
      case SelectionType.Tile:
        prefix = "t";
        break;
    }

    const spriteName = convertToSpriteName(selection.id, prefix);
    const sprite = this.viewport.getChildByName(spriteName) as Sprite;
    if (!sprite) {
      return;
    }

    // Apply glow filter to the original sprite
    sprite.filters = [this.GLOW_FILTER];
    this.selectedSprite = sprite;
  }

  removeItem(id: number): void {
    if (!this.viewport) return;

    const { selection } = useStore.getState();

    // Check if this is the currently selected item
    if (selection.id === id) {
      // Clear selection before removing to avoid filter errors
      this.clearSelection();
    }

    const spriteName = convertToSpriteName(id, "g");
    const oldSprite = this.viewport.getChildByName(spriteName) as Sprite;
    if (oldSprite) {
      this.viewport.removeChild(oldSprite);
    }

    const buildingName = convertToSpriteName(id, "b");
    const buildingSprite = this.viewport.getChildByName(buildingName) as Sprite;
    if (buildingSprite) {
      this.viewport.removeChild(buildingSprite);
    }
  }

  /**
   * Generate a random position within a hex tile
   * @param hexPos The hex coordinates
   * @param useTopHalf Whether to use the top half (true) or bottom half (false) of the hex
   * @returns A random position as {x, y} coordinates
   */
  private getRandomPositionInHex(
    hexPos: Hex,
    useTopHalf: boolean
  ): Vector2.Vector2 {
    const hexCenter = this.layout.hexToPixel(hexPos);
    const hexHeight = this.HEX_SIZE * 2;
    const hexWidth = this.HEX_SIZE * Math.sqrt(3);

    // Random position horizontally (-0.5 to 0.5 of hex width)
    const randX = hexCenter.x + (Math.random() * hexWidth - hexWidth / 2) * 0.6;

    // For y position:
    // - If useTopHalf is true: use the top half (negative offset from center)
    // - If useTopHalf is false: use the bottom half (positive offset from center)
    const yDirection = useTopHalf ? -1 : 1;
    const randY =
      hexCenter.y + yDirection * ((Math.random() * hexHeight) / 2) * 0.6;

    return Vector2.create(randX, randY);
  }

  async updateScenegraphGroup(group: Group, uid?: string): Promise<void> {
    const { selection } = useStore.getState();

    if (!this.initialFocusSet) {
      this.initialFocusSet = true;
      this.centerOn(group.pos);
    }

    const spriteName = convertToSpriteName(group.id, "g");
    const isCurrentlySelected =
      this.selectedSprite &&
      selection.type === SelectionType.Group &&
      selection.id === group.id;

    // If this group is selected, clear selection before removing the sprite
    if (isCurrentlySelected) {
      this.clearSelection();
    }

    // Remove existing sprite to prevent duplicates
    this.removeItem(group.id);

    // Create new sprite
    const texture = await Assets.load(getGroupSprite(group.owner));
    const object = new Sprite(texture);
    object.label = spriteName;
    object.scale.set(0.5, 0.5);
    object.anchor.set(0.5, 0.5);
    object.interactive = true;
    object.cursor = "pointer";
    object.hitArea = new Rectangle(-25, -25, 50, 50);
    object.on("pointerup", (event: FederatedPointerEvent) => {
      if (this.isDragging) {
        return;
      }
      if (event.button === 0) {
        console.log(`clicked group ${group.id}`);
        const { setSelection } = useStore.getState();
        setSelection({ type: SelectionType.Group, id: group.id });
        this.updateSelection();
      } else if (event.button === 2) {
        console.log(`right clicked group ${group.id}`);
      } else if (event.button === 1) {
        console.log(`middle clicked group ${group.id}`);
        this.viewport.follow(object);
      }
    });
    this.viewport.addChild(object);

    // Position at a random point in the bottom half of the hex
    const randomPos = this.getRandomPositionInHex(group.pos, false);

    // Update the sprite position
    object.x = randomPos.x;
    object.y = randomPos.y;
    object.zIndex = ZIndices.Units;

    // Handle animation for moving groups
    const isMoving = group.targetHexes && group.targetHexes.length > 0;
    if (isMoving) {
      this.startMovementAnimation(spriteName, object);
    } else {
      this.stopMovementAnimation(spriteName, object);
    }

    // Restore selection state if this was the selected group
    if (isCurrentlySelected) {
      // Apply glow filter to the object
      object.filters = [this.GLOW_FILTER];
      this.selectedSprite = object;
    }

    // Update movement indicator
    const oldSprite = this.viewport.getChildByName(
      "MovementIndicator"
    ) as Container;
    if (oldSprite) {
      this.viewport.removeChild(oldSprite);
    }

    if (uid && group.owner === uid) {
      const movementIndicatorContainer = new Container();
      movementIndicatorContainer.label = "MovementIndicator";
      movementIndicatorContainer.zIndex = ZIndices.Units;

      this.viewport.addChild(movementIndicatorContainer);

      for (const hex of group.targetHexes) {
        const indicator = new Graphics();
        indicator.beginFill(0x0000ff);
        indicator.drawCircle(5, 5, 5);
        indicator.endFill();

        const hexPoint = this.layout.hexToPixel(hex);
        indicator.x = hexPoint.x - 5;
        indicator.y = hexPoint.y - 5;
        indicator.alpha = 0.7;

        movementIndicatorContainer.addChild(indicator);
      }
    }
  }

  /**
   * Start the wobble animation for a moving group
   * @param spriteName The unique name of the sprite
   * @param sprite The sprite to animate
   */
  private startMovementAnimation(spriteName: string, sprite: Sprite): void {
    // Cancel any existing animation
    this.stopMovementAnimation(spriteName);

    // Initialize animation parameters
    let time = 0;
    const animationSpeed = 0.05;
    const bobHeight = 4; // Maximum vertical movement
    const rotationAmount = 0.1; // Maximum rotation in radians (increased)

    // Store sprite's original position
    const originalY = sprite.y;

    // Animation function
    const animate = () => {
      time += animationSpeed;

      // Vertical bobbing motion
      sprite.y = originalY + Math.sin(time) * bobHeight;

      // Slight rotation - make it more noticeable
      sprite.angle = Math.sin(time * 1.5) * ((rotationAmount * 180) / Math.PI);

      // Request next frame
      const frameId = requestAnimationFrame(animate);
      this.animationFrameIds.set(spriteName, frameId);
    };

    // Start the animation
    animate();
  }

  /**
   * Stop the wobble animation for a group
   * @param spriteName The unique name of the sprite
   * @param sprite Optional sprite to reset position and rotation
   */
  private stopMovementAnimation(spriteName: string, sprite?: Sprite): void {
    // Cancel the animation if it exists
    const frameId = this.animationFrameIds.get(spriteName);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrameIds.delete(spriteName);
    }

    // Reset sprite position and rotation if provided
    if (sprite) {
      sprite.angle = 0;
    }
  }

  async updateScenegraphBuilding(building: Building): Promise<void> {
    if (!this.viewport) return;

    const { selection } = useStore.getState();
    const spriteName = convertToSpriteName(building.id, "b");
    const isCurrentlySelected =
      this.selectedSprite &&
      selection.type === SelectionType.Building &&
      selection.id === building.id;

    // Clear selection temporarily if this building is selected
    if (isCurrentlySelected) {
      this.clearSelection();
    }

    let object = this.viewport.getChildByName(spriteName) as Sprite;

    // If object already exists, we only need to update its position if it moved
    // Otherwise we need to create a new sprite
    const isNewSprite = !object;

    if (isNewSprite) {
      const texture = await Assets.load(getBuildingSprite(building));
      object = new Sprite(texture);
      object.label = spriteName;
      object.scale.set(0.5, 0.5);
      object.anchor.set(0.5, 0.5);
      object.interactive = true;
      object.cursor = "pointer";
      object.hitArea = new Rectangle(-25, -25, 50, 50);
      object.on("pointerup", (event: FederatedPointerEvent) => {
        if (this.isDragging) {
          return;
        }
        const { setSelection } = useStore.getState();
        if (event.button === 0) {
          console.log(`clicked building ${building.id}`);
          setSelection({ type: SelectionType.Building, id: building.id });
          this.updateSelection();
        }
      });

      // For new sprites, set a random position in the top half of the hex
      const randomPos = this.getRandomPositionInHex(building.position, true);
      object.x = randomPos.x;
      object.y = randomPos.y;

      this.viewport.addChild(object);
    } else {
      // For existing sprites that moved, update their position based on the hex center
      // This preserves their relative offset within the hex
      const oldHexCenter = this.layout.hexToPixel(building.position);
      const currentOffsetX = object.x - oldHexCenter.x;
      const currentOffsetY = object.y - oldHexCenter.y;

      const newHexCenter = this.layout.hexToPixel(building.position);
      object.x = newHexCenter.x + currentOffsetX;
      object.y = newHexCenter.y + currentOffsetY;
    }

    object.zIndex = ZIndices.Buildings;

    // Restore selection if this was the selected building
    if (isCurrentlySelected) {
      object.filters = [this.GLOW_FILTER];
      this.selectedSprite = object;
    }
  }

  async updateScenegraphTile(tile: ClientTile): Promise<void> {
    const { setSelection } = useStore.getState();
    const spriteName = convertToSpriteName(tile.id, "t");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      const texture = await Assets.load(getTerrainTexture(tile));
      object = new Sprite(texture);
      object.label = spriteName;
      this.viewport.addChild(object);
      object.interactive = true;
      object.on("pointerup", (event: FederatedPointerEvent) => {
        const { selection } = useStore.getState();
        if (this.isDragging) {
          return;
        }
        if (event.button === 0) {
          console.log(`clicked tile ${tile.id}`);
          setSelection({ type: SelectionType.Tile, id: tile.id });
          this.updateSelection();
        } else if (event.button === 2) {
          console.log(`right clicked tile ${tile.id}`);
          if (selection.type === SelectionType.Group) {
            this.socket.emit("request movement", {
              selection: selection.id,
              target: tile.hex,
            });
          }
        } else if (event.button === 1) {
          console.log(`middle clicked tile ${tile.id}`);
        }
      });
    }

    const hexCenter = this.layout.hexToPixel(tile.hex);
    object.anchor.set(0.5, 0.5);
    object.x = hexCenter.x;
    object.y = hexCenter.y;
    object.width = this.layout.size.x * Math.sqrt(3) - 2;
    object.height = this.layout.size.y * 2 - 2;
    object.zIndex = ZIndices.Tiles;
    object.visible = true;
    object.alpha = tile.visible ? 1 : 0.5;
  }

  zoomIn(): void {
    if (!this.viewport) return;
    this.viewport.zoom(-200, true);
  }

  zoomOut(): void {
    if (!this.viewport) return;
    this.viewport.zoom(200, true);
  }

  resetZoom(): void {
    if (!this.viewport) return;
    this.viewport.setZoom(1);
  }

  centerViewport(x = 0, y = 0): void {
    if (!this.viewport) return;
    this.viewport.center = new Point(x, y);
  }

  centerOn(pos: Hex): void {
    if (!this.viewport) return;
    const point = this.layout.hexToPixel(pos);
    this.viewport.animate({
      time: 400,
      position: {
        x: point.x,
        y: point.y,
      },
    });
  }

  private getSelectionZIndex(selection: Selection): number {
    switch (selection.type) {
      case SelectionType.Group:
        return ZIndices.UnitsSelection;
      case SelectionType.Building:
        return ZIndices.BuildingsSelection;
      case SelectionType.Tile:
        return ZIndices.TileSelection;
      default:
        return ZIndices.TileSelection;
    }
  }

  toggleDebugMode(): void {
    this.debugMode = !this.debugMode;
    console.log(`Debug mode: ${this.debugMode ? "ON" : "OFF"}`);

    if (this.debugMode) {
      this.renderDebugHexGrid();
    } else {
      this.clearDebugVisuals();
    }
  }

  clearDebugVisuals(): void {
    if (!this.viewport) return;

    if (this.debugContainer) {
      this.viewport.removeChild(this.debugContainer);
      this.debugContainer.destroy();
      this.debugContainer = null;
    }

    // Remove all coordinate text elements
    this.viewport.children.forEach((child) => {
      if (child.label === "debug_coord") {
        this.viewport!.removeChild(child);
      }
    });
  }

  renderDebugHexGrid(): void {
    if (!this.viewport) return;

    // Clear previous debug visuals first
    this.clearDebugVisuals();

    this.debugContainer = new Container();
    this.debugContainer.zIndex = ZIndices.Debug;
    this.viewport.addChild(this.debugContainer);

    // Render visible hex boundaries
    const { world } = useStore.getState();
    Object.values(world.tiles).forEach((tile: Tile) => {
      const cTile = tile as ClientTile;
      const corners = this.layout.polygonCorners(cTile.hex);
      const center = this.layout.hexToPixel(cTile.hex);

      const outline = new Graphics();

      // Draw the hexagon using the new API
      outline.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        outline.lineTo(corners[i].x, corners[i].y);
      }
      outline.lineTo(corners[0].x, corners[0].y);
      outline.stroke({ color: 0x000000, width: 1, pixelLine: true });

      this.debugContainer?.addChild(outline);

      const coordText = new Text(`${cTile.hex.q},${cTile.hex.r}`, {
        fontSize: 8,
        fill: 0x000000,
      });
      coordText.position.set(center.x - 10, center.y - 5);
      coordText.zIndex = ZIndices.Debug;
      coordText.label = "debug_coord";
      this.debugContainer?.addChild(coordText);
    });
  }
}
