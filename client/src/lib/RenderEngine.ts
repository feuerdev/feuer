import {
  Application,
  Container,
  Sprite,
  Graphics,
  Point,
  Assets,
} from "pixi.js";
import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";
import { Layout, Hex, equals } from "@shared/hex";
import * as Vector2 from "@shared/vector2";
import Rules from "@shared/rules.json";
import { ClientTile, Selection, SelectionType, ZIndices } from "./types";
import { Building, Group } from "@shared/objects";
import { convertToSpriteName } from "@shared/util";

export class RenderEngine {
  private app: Application = new Application();
  private viewport!: Viewport;
  private readonly HEX_SIZE: number = 40;
  private layout: Layout = new Layout(
    Layout.pointy,
    Vector2.create(this.HEX_SIZE, this.HEX_SIZE),
    Vector2.create(0, 0)
  );
  private viewportReady: boolean = false;
  private initialFocusSet: boolean = false;
  private readonly GLOW_FILTER: GlowFilter = new GlowFilter({
    distance: 30,
    outerStrength: 2,
    color: 0x000000,
  });

  async mount(): Promise<void> {
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    document.body.appendChild(this.app.canvas);

    await Assets.init({
      manifest: "assets/manifest.json",
    });

    // Get dimensions after app is initialized
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    this.viewport = new Viewport({
      screenWidth,
      screenHeight,
      worldWidth: (Rules.settings.map_size * 2 + 1) * this.HEX_SIZE,
      worldHeight: (Rules.settings.map_size * 2 + 1) * this.HEX_SIZE,
      events: this.app.renderer.events,
    });

    // Add the viewport to the stage
    this.app.stage.addChild(this.viewport);

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

    window.addEventListener("resize", this.handleResize);

    this.viewportReady = true;
  }

  private handleResize = (): void => {
    if (!this.app || !this.viewport) return;

    this.app.renderer.resize(window.innerWidth, window.innerHeight);

    // Update viewport dimensions on resize
    this.viewport.screenWidth = this.app.screen.width;
    this.viewport.screenHeight = this.app.screen.height;
    this.viewport.resize(this.app.screen.width, this.app.screen.height);
  };

  registerClickHandler(
    handler: (point: { x: number; y: number }, button: number) => void
  ): boolean {
    if (!this.viewport || !this.viewportReady) {
      console.warn("Viewport not initialized - click handler not set");
      return false;
    }

    this.viewport.on("clicked", (e: any) => {
      // Handle both old (pixi-viewport) and new (PixiJS v8) event formats
      if (e.world) {
        // Old pixi-viewport format
        handler({ x: e.world.x, y: e.world.y }, e.event.data.button || 0);
      } else if (e.global) {
        // New PixiJS v8 format
        const worldPos = this.viewport?.toWorld(e.global.x, e.global.y);
        if (worldPos) {
          handler({ x: worldPos.x, y: worldPos.y }, e.button || 0);
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
      object = new Sprite(this.spriteManager.getGroupSprite(group.owner));
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
      object = new Sprite(this.spriteManager.getBuildingSprite(building));
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
      object = new Sprite(this.spriteManager.getTerrainTexture(tile));
      object.name = spriteName;
      this.viewport.addChild(object);
    }

    object.x = this.layout.hexToPixel(tile.hex).x - this.HEX_SIZE;
    object.y = this.layout.hexToPixel(tile.hex).y - this.HEX_SIZE;
    object.zIndex = ZIndices.Tiles;
    object.visible = tile.visible;
  }

  findSpritesAtPoint(point: {
    x: number;
    y: number;
  }): Array<Sprite | Container | Graphics> {
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
    const parts = sprite.name.split("_");
    if (parts.length !== 2) return null;

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

  destroy(): void {
    window.removeEventListener("resize", this.handleResize);

    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }

    this.viewportReady = false;
    this.initialFocusSet = false;
  }
}
