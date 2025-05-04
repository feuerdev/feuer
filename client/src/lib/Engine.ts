import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";

import * as Util from "@shared/util";
import { Layout, equals, round, hash, neighborsRange, Hex } from "@shared/hex";
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
  Sprite,
  Text,
} from "pixi.js";

export class Engine {
  private viewport: Viewport;
  private readonly HEX_SIZE: number = 40;
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
  private debugGraphics: Graphics | null = null;

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

    // Add a debug red rectangle
    const debugRect = new Graphics();
    debugRect.rect(0, 0, 100, 100);
    debugRect.stroke({ color: 0xff0000, width: 1 });
    // app.stage.addChild(debugRect);
    viewport.addChild(debugRect);

    this.registerClickHandler();

    window.addEventListener("keyup", this.handleKeyUp, false);
    window.addEventListener("resize", this.resize, false);
    this.socket.on("gamestate tiles", this.handleTilesUpdate);
    this.socket.on("gamestate group", this.handleGroupUpdate);
    this.socket.on("gamestate groups", this.handleGroupsUpdate);
    this.socket.on("gamestate building", this.handleBuildingUpdate);

    this.requestTiles(this.socket);

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.initialFocusSet = false;
      });
    }
  }

  destroy(): void {
    // Remove event listeners
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("resize", this.resize);

    // Remove socket listeners
    this.socket.off("gamestate tiles", this.handleTilesUpdate);
    this.socket.off("gamestate group", this.handleGroupUpdate);
    this.socket.off("gamestate groups", this.handleGroupsUpdate);
    this.socket.off("gamestate building", this.handleBuildingUpdate);

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
  };

  private handleGroupsUpdate = (groups: Hashtable<Group>) => {
    const { world, setWorld } = useStore.getState();
    const newGroups: Hashtable<Group> = {};
    const visitedOldGroups: Hashtable<boolean> = {};
    let needsTileUpdate = false;

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

    Object.entries(world.groups).forEach(([id, oldGroup]) => {
      if (!visitedOldGroups[id]) {
        this.removeItem(oldGroup.id);
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

  private handleBuildingUpdate = (building: Building) => {
    const { world, setWorld } = useStore.getState();
    setWorld({
      ...world,
      buildings: {
        ...world.buildings,
        [building.id]: building,
      },
    });
    this.updateScenegraphBuilding(building);
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

  private registerClickHandler(): boolean {
    const { selection, setSelection } = useStore.getState();
    this.viewport.on("click", (e: FederatedPointerEvent) => {
      const worldPos = this.viewport?.toWorld(e.global.x, e.global.y);
      if (worldPos) {
        const vec2Point = Vector2.create(worldPos.x, worldPos.y);
        switch (e.button) {
          case 0: {
            const sprites = this.findSpritesAtPoint(vec2Point);
            if (sprites.length === 0) {
              setSelection({ type: SelectionType.None });
              return;
            }

            let highestZ = -1;
            let topSprite = sprites[0];
            sprites.forEach((sprite) => {
              if (sprite.zIndex > highestZ) {
                highestZ = sprite.zIndex;
                topSprite = sprite;
              }
            });

            const name = topSprite.label;
            if (!name) return;

            const parts = name.split("_");
            if (parts.length !== 2) return;

            const prefix = parts[0];
            const id = parseInt(parts[1]);

            const newSelection: Selection = { id, type: SelectionType.None };
            switch (prefix) {
              case "g":
                newSelection.type = SelectionType.Group;
                break;
              case "b":
                newSelection.type = SelectionType.Building;
                break;
              case "t":
                newSelection.type = SelectionType.Tile;
                break;
            }

            setSelection(newSelection);
            break;
          }
          case 2: {
            const clickedHex = round(this.layout.pixelToHex(vec2Point));
            if (clickedHex && selection.type === SelectionType.Group) {
              this.socket.emit("request movement", {
                selection: selection.id,
                target: clickedHex,
              });
            }
            break;
          }
        }
      }
    });

    return true;
  }

  updateSelection(selection: Selection): void {
    if (!this.viewport) return;

    const oldSprite = this.viewport.getChildByName("selection") as Sprite;
    if (oldSprite) {
      this.viewport.removeChild(oldSprite);
    }

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
    const original = this.viewport.getChildByName(spriteName) as Sprite;
    if (!original) {
      return;
    }

    const sprite = new Sprite(original.texture);
    sprite.label = "selection";
    sprite.anchor.set(0.5, 0.5);
    this.viewport.addChild(sprite);

    sprite.position.set(original.position.x, original.position.y);
    sprite.zIndex = this.getSelectionZIndex(selection);
    sprite.width = original.width;
    sprite.height = original.height;

    sprite.filters = [this.GLOW_FILTER];
  }

  removeItem(id: number): void {
    if (!this.viewport) return;

    const oldSprite = this.viewport.getChildByName(String(id)) as Sprite;
    if (oldSprite) {
      this.viewport.removeChild(oldSprite);
    }
  }

  async updateScenegraphGroup(group: Group, uid?: string): Promise<void> {
    if (!this.viewport) return;

    if (!this.initialFocusSet) {
      this.initialFocusSet = true;
      this.centerOn(group.pos);
    }

    const spriteName = convertToSpriteName(group.id, "g");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      const texture = await Assets.load(getGroupSprite(group.owner));
      object = new Sprite(texture);
      object.label = spriteName;
      object.scale.set(0.5, 0.5);
      object.anchor.set(0.5, 0.5);
      this.viewport.addChild(object);
    }

    // Position at the center of the hex
    const hexCenter = this.layout.hexToPixel(group.pos);
    object.x = hexCenter.x;
    object.y = hexCenter.y;
    object.zIndex = ZIndices.Units;

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

  async updateScenegraphBuilding(building: Building): Promise<void> {
    if (!this.viewport) return;

    const spriteName = convertToSpriteName(building.id, "b");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      const texture = await Assets.load(getBuildingSprite(building));
      object = new Sprite(texture);
      object.label = spriteName;
      object.scale.set(0.5, 0.5);
      object.anchor.set(0.5, 0.5);
      this.viewport.addChild(object);
    }

    // Position at the center of the hex
    const hexCenter = this.layout.hexToPixel(building.position);
    object.x = hexCenter.x;
    object.y = hexCenter.y;
    object.zIndex = ZIndices.Buildings;
  }

  async updateScenegraphTile(tile: ClientTile): Promise<void> {
    if (!this.viewport) return;

    const spriteName = convertToSpriteName(tile.id, "t");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      const texture = await Assets.load(getTerrainTexture(tile));
      object = new Sprite(texture);
      object.label = spriteName;
      this.viewport.addChild(object);
    }

    // Position the tile at its center point
    const hexCenter = this.layout.hexToPixel(tile.hex);
    object.anchor.set(0.5, 0.5);
    object.x = hexCenter.x;
    object.y = hexCenter.y;
    object.zIndex = ZIndices.Tiles;
    object.visible = tile.visible;
  }

  findSpritesAtPoint(
    point: Vector2.Vector2
  ): Array<Sprite | Container | Graphics> {
    if (!this.viewport) return [];

    const found: Array<Sprite | Container | Graphics> = [];
    const clickedHex = round(this.layout.pixelToHex(point));

    this.viewport.children.forEach((child) => {
      // Skip non-sprite objects or objects without a name
      if (!child.label) return;

      // Skip debug elements
      if (child.label === "debug_coord") return;

      // Check if this is a tile, group, or building by name prefix
      const prefix = child.label.charAt(0);
      if (prefix === "t" || prefix === "g" || prefix === "b") {
        const parts = child.label.split("_");
        if (parts.length !== 2) return;

        const id = parseInt(parts[1]);
        const { world } = useStore.getState();

        // Get the hex based on the object type
        let objectHex: Hex | undefined;
        if (prefix === "t" && world.tiles[id]) {
          objectHex = (world.tiles[id] as ClientTile).hex;
        } else if (prefix === "g" && world.groups[id]) {
          objectHex = world.groups[id].pos;
        } else if (prefix === "b" && world.buildings[id]) {
          objectHex = world.buildings[id].position;
        }

        if (objectHex && equals(objectHex, clickedHex)) {
          found.push(child as Sprite | Container | Graphics);
        }
      }
    });

    return found;
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

    // Remove the debug graphics
    if (this.debugGraphics) {
      this.viewport.removeChild(this.debugGraphics);
      this.debugGraphics = null;
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

    this.debugGraphics = new Graphics();
    this.debugGraphics.zIndex = ZIndices.Debug;
    this.viewport.addChild(this.debugGraphics);

    // Render visible hex boundaries
    const { world } = useStore.getState();
    Object.values(world.tiles).forEach((tile: Tile) => {
      const cTile = tile as ClientTile;
      // if (cTile.visible) {
        const corners = this.layout.polygonCorners(cTile.hex);

        this.debugGraphics!.lineStyle(1, 0xff0000, 0.8);

        // Draw the hex boundary
        this.debugGraphics!.moveTo(corners[5].x, corners[5].y);
        for (const corner of corners) {
          this.debugGraphics!.lineTo(corner.x, corner.y);
        }

        // Draw hex coordinates for debugging
        const center = this.layout.hexToPixel(cTile.hex);

        // Create a text object instead of using Graphics text methods
        const coordText = new Text(`${cTile.hex.q},${cTile.hex.r}`, {
          fontSize: 8,
          fill: 0x000000,
        });
        coordText.position.set(center.x - 10, center.y - 5);
        coordText.zIndex = ZIndices.Debug;
        coordText.label = "debug_coord";
        this.viewport.addChild(coordText);
      // }
    });
  }
}
