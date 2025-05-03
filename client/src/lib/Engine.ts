import {
  Container,
  Sprite,
  Graphics,
  Point,
  Assets,
  FederatedPointerEvent,
} from "pixi.js";
import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";

import * as Util from "@shared/util";
import { Layout, equals, round, hash, neighborsRange, Hex } from "@shared/hex";
import * as Vector2 from "@shared/vector2";
import Rules from "@shared/rules.json";
import { ClientTile, Selection, SelectionType, ZIndices } from "./types";
import { Building, Group, Tile } from "@shared/objects";
import { convertToSpriteName, Hashtable } from "@shared/util";
import {
  usePixiAppStore,
  useSelectionStore,
  useSocketStore,
  useWorldStore,
} from "@/lib/state";
import * as PlayerRelation from "@shared/relation";
import {
  getBuildingSprite,
  getGroupSprite,
  getTerrainTexture,
} from "./sprites";
import { Socket } from "socket.io-client";

export class Engine {
  private viewport!: Viewport;
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

  async mount(): Promise<void> {
    const app = usePixiAppStore.getState().app;
    if (!app) {
      console.error("No Pixi application found in store");
      return;
    }

    await Assets.init({
      manifest: "manifest.json",
    });

    await Assets.loadBundle("main");

    // Get dimensions after app is initialized
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    this.viewport = new Viewport({
      screenWidth,
      screenHeight,
      worldWidth: (Rules.settings.map_size * 2 + 1) * this.HEX_SIZE,
      worldHeight: (Rules.settings.map_size * 2 + 1) * this.HEX_SIZE,
      events: app.renderer.events,
    });

    // Add the viewport to the stage
    app.stage.addChild(this.viewport);

    // Configure the viewport for user interaction
    this.viewport.sortableChildren = true;
    this.viewport
      .clampZoom({
        maxScale: 2,
        minScale: 0.2,
      })
      .drag()
      .pinch()
      .wheel()
      .decelerate();

    this.registerClickHandler();

    window.addEventListener("resize", this.handleResize);
    window.addEventListener("keyup", this.handleKeyUp, false);

    const socket = useSocketStore.getState().socket;
    socket.on("gamestate tiles", this.handleTilesUpdate);
    socket.on("gamestate group", this.handleGroupUpdate);
    socket.on("gamestate groups", this.handleGroupsUpdate);
    socket.on("gamestate building", this.handleBuildingUpdate);

    this.requestTiles(socket);
  }

  private requestTiles = (socket: Socket) => {
    socket.emit("request tiles");
  };

  private handleGroupUpdate = (group: Group) => {
    const { world, setWorld } = useWorldStore.getState();
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
    const socket = useSocketStore.getState().socket;
    const { world, setWorld } = useWorldStore.getState();
    const newGroups: Hashtable<Group> = {};
    const visitedOldGroups: Hashtable<boolean> = {};
    let needsTileUpdate = false;

    // Process received groups
    Object.values(groups).forEach((receivedGroup) => {
      const oldGroup = world.groups[receivedGroup.id];
      visitedOldGroups[receivedGroup.id] = true;

      // Check if group is new, has moved or upgraded
      if (
        !oldGroup ||
        !equals(oldGroup.pos, receivedGroup.pos) ||
        oldGroup.spotting !== receivedGroup.spotting
      ) {
        this.updateScenegraphGroup(receivedGroup, this.uid);
        needsTileUpdate = true;
      }

      // If group is new and foreign, request relation
      if (
        !oldGroup &&
        receivedGroup.owner !== this.uid &&
        world.playerRelations[
          PlayerRelation.hash(receivedGroup.owner, this.uid)
        ] === undefined
      ) {
        socket.emit("request relation", {
          id1: receivedGroup.owner,
          id2: this.uid,
        });
      }

      newGroups[receivedGroup.id] = receivedGroup;
    });

    // Remove groups that are not in the new list
    Object.entries(world.groups).forEach(([id, oldGroup]) => {
      if (!visitedOldGroups[id]) {
        this.removeItem(oldGroup.id);
        needsTileUpdate = true;
      }
    });

    // Update world state
    setWorld({
      ...world,
      groups: newGroups,
    });

    if (needsTileUpdate) {
      this.requestTiles(socket);
    }
  };

  private handleBuildingUpdate = (building: Building) => {
    const { world, setWorld } = useWorldStore.getState();
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
    const { world, setWorld } = useWorldStore.getState();
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
      case "=":
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
      default:
        break;
    }
  };

  private handleResize = (): void => {
    const app = usePixiAppStore.getState().app;
    if (!app || !this.viewport) return;

    app.renderer.resize(window.innerWidth, window.innerHeight);

    // Update viewport dimensions on resize
    this.viewport.screenWidth = app.screen.width;
    this.viewport.screenHeight = app.screen.height;
    this.viewport.resize(app.screen.width, app.screen.height);
  };

  private registerClickHandler(): boolean {
    const { selection, setSelection } = useSelectionStore.getState();
    const { socket } = useSocketStore.getState();
    this.viewport.on("click", (e: FederatedPointerEvent) => {
      const worldPos = this.viewport?.toWorld(e.global.x, e.global.y);
      if (worldPos) {
        const vec2Point = Vector2.create(worldPos.x, worldPos.y);
        switch (e.button) {
          case 0: {
            // Left
            const sprites = this.findSpritesAtPoint(vec2Point);
            if (sprites.length === 0) {
              // Clicked on empty space, clear selection
              setSelection({ type: SelectionType.None });
              return;
            }

            // Find the sprite with highest z-index (topmost)
            let highestZ = -1;
            let topSprite = sprites[0];
            sprites.forEach((sprite) => {
              if (sprite.zIndex > highestZ) {
                highestZ = sprite.zIndex;
                topSprite = sprite;
              }
            });

            // Extract entity type and ID from sprite name
            const name = topSprite.name;
            if (!name) return;

            const parts = name.split("_");
            if (parts.length !== 2) return;

            const prefix = parts[0];
            const id = parseInt(parts[1]);

            // Create selection based on entity type - changed let to const
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

            // Update selection
            setSelection(newSelection);
            break;
          }
          case 2: {
            // Right - Added braces for lexical declaration
            const clickedHex = round(this.layout.pixelToHex(vec2Point));
            if (clickedHex && selection.type === SelectionType.Group) {
              socket.emit("request movement", {
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
    sprite.name = "selection";
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

  updateScenegraphGroup(group: Group, uid?: string): void {
    if (!this.viewport) return;

    if (!this.initialFocusSet) {
      this.initialFocusSet = true;
      this.centerOn(group.pos);
    }

    const spriteName = convertToSpriteName(group.id, "g");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      object = new Sprite(Assets.get(getGroupSprite(group.owner)));
      object.name = spriteName;
      object.scale.set(0.5, 0.5);
      this.viewport.addChild(object);
    }

    object.x = this.layout.hexToPixel(group.pos).x - this.HEX_SIZE / 3;
    object.y = this.layout.hexToPixel(group.pos).y + this.HEX_SIZE / 3;
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
      movementIndicatorContainer.name = "MovementIndicator";
      movementIndicatorContainer.zIndex = ZIndices.Units;

      this.viewport.addChild(movementIndicatorContainer);

      for (const hex of group.targetHexes) {
        const indicator = new Graphics();
        indicator.beginFill(0x0000ff);
        indicator.drawCircle(5, 5, 5);
        indicator.endFill();
        indicator.x = this.layout.hexToPixel(hex).x - this.HEX_SIZE / 3;
        indicator.y = this.layout.hexToPixel(hex).y + this.HEX_SIZE / 3;
        indicator.alpha = 0.7;

        movementIndicatorContainer.addChild(indicator);
      }
      // In PixiJS v8, calculateBounds is no longer needed, the bounds are updated automatically
    }
  }

  updateScenegraphBuilding(building: Building): void {
    if (!this.viewport) return;

    const spriteName = convertToSpriteName(building.id, "b");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      object = new Sprite(Assets.get(getBuildingSprite(building)));
      object.name = spriteName;
      object.scale.set(0.5, 0.5);
      this.viewport.addChild(object);
    }

    object.x = this.layout.hexToPixel(building.position).x - this.HEX_SIZE / 3;
    object.y = this.layout.hexToPixel(building.position).y + this.HEX_SIZE / 3;
    object.zIndex = ZIndices.Buildings;
  }

  updateScenegraphTile(tile: ClientTile): void {
    if (!this.viewport) return;

    const spriteName = convertToSpriteName(tile.id, "t");
    let object = this.viewport.getChildByName(spriteName) as Sprite;
    if (!object) {
      object = new Sprite(Assets.get(getTerrainTexture(tile)));
      object.name = spriteName;
      this.viewport.addChild(object);
    }

    object.x = this.layout.hexToPixel(tile.hex).x - this.HEX_SIZE;
    object.y = this.layout.hexToPixel(tile.hex).y - this.HEX_SIZE;
    object.zIndex = ZIndices.Tiles;
    object.visible = tile.visible;
  }

  findSpritesAtPoint(
    point: Vector2.Vector2
  ): Array<Sprite | Container | Graphics> {
    if (!this.viewport) return [];

    const found: Array<Sprite | Container | Graphics> = [];
    const hexCoord = this.layout.pixelToHex(point);

    this.viewport.children.forEach((child) => {
      // Skip non-sprite objects or objects without a name
      if (!child.name) return;

      // Check if this is a tile, group, or building by name prefix
      const prefix = child.name.charAt(0);
      if (prefix === "t" || prefix === "g" || prefix === "b") {
        const childHex = this.getHexFromSprite(child as Container);
        if (childHex && equals(childHex, hexCoord)) {
          found.push(child as Sprite | Container | Graphics);
        }
      }
    });

    return found;
  }

  private getHexFromSprite(sprite: Container): Hex | null {
    // Extract the ID from the sprite name (format is "prefix_id")
    const parts = sprite.name?.split("_");
    if (!parts || parts.length !== 2) return null;

    const prefix = parts[0];

    // We would need access to the game state to convert IDs to hex coordinates
    // This is a simplification - in a real implementation, we would need to
    // either store this mapping or access it through a callback

    // For now, we'll use the sprite's position to approximate the hex
    if (!this.viewport) return null;

    const position = {
      x: sprite.x + this.HEX_SIZE,
      y: sprite.y + this.HEX_SIZE,
    };

    if (prefix === "g" || prefix === "b") {
      position.x += this.HEX_SIZE / 3;
      position.y -= this.HEX_SIZE / 3;
    }

    return this.layout.pixelToHex(position);
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
    this.viewport.moveCenter(new Point(point.x, point.y));
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
}
