import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";
import { Layout, Hex } from "@shared/hex";
import * as Vector2 from "@shared/vector2";
import Rules from "@shared/rules.json";
import { ClientTile, Selection, SelectionType, ZIndices } from "./types";
import { Biome, Building, Group } from "@shared/objects";
import { Filter, Loader } from "pixi.js";
import Sprites from "./sprites.json";
import Buildings from "@shared/templates/buildings.json";
import { convertToSpriteName } from "@shared/util";

export class RenderEngine {
  app: PIXI.Application | null = null;
  viewport: Viewport | null = null;
  elements: Record<string, PIXI.DisplayObject> = {};
  layout: Layout;
  viewportReady: boolean = false;
  private initialFocusSet: boolean = false;
  private readonly HEX_SIZE: number;
  private readonly GLOW_FILTER: Filter;

  constructor(hexSize: number = 40) {
    this.HEX_SIZE = hexSize;
    this.layout = new Layout(
      Layout.pointy,
      Vector2.create(this.HEX_SIZE, this.HEX_SIZE),
      Vector2.create(0, 0)
    );

    this.GLOW_FILTER = new GlowFilter({
      distance: 30,
      outerStrength: 2,
      color: 0x000000,
    }) as unknown as Filter;
  }

  async loadAssets(): Promise<void> {
    PIXI.utils.clearTextureCache();
    Loader.shared.reset();

    for (const sprite of Sprites) {
      Loader.shared.add(sprite, `../${sprite}.png`);
    }

    return new Promise<void>((resolve) => {
      Loader.shared.load(() => resolve());
    });
  }

  mount(canvas: HTMLCanvasElement): void {
    // First clean up any existing renderer
    this.destroy();
    this.viewportReady = false;

    // Create a PIXI Application
    this.app = new PIXI.Application({
      view: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 1,
      forceCanvas: false,
      // Important: Use PIXI's ticker for consistent updates
      autoStart: true,
    });

    // Initialize viewport
    this.initializeViewport();

    // Set up event listeners
    this.setupEventListeners();

    this.viewportReady = true;
  }

  private initializeViewport(): void {
    if (!this.app) return;

    this.viewport = new Viewport({
      screenWidth: this.app.screen.width,
      screenHeight: this.app.screen.height,
      worldWidth: (Rules.settings.map_size * 2 + 1) * this.HEX_SIZE,
      worldHeight: (Rules.settings.map_size * 2 + 1) * this.HEX_SIZE,
      // This is crucial - use the application's interaction manager
      interaction: this.app.renderer.plugins.interaction,
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
  }

  private setupEventListeners(): void {
    window.addEventListener("resize", this.handleResize);
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

    this.viewport.on("clicked", (click) => {
      handler({ x: click.world.x, y: click.world.y }, click.event.data.button);
    });

    return true;
  }

  updateSelection(selection: Selection): void {
    if (!this.viewport) return;

    const oldSprite = this.viewport.getChildByName(
      "selection"
    ) as PIXI.Graphics;
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
    const original = this.viewport.getChildByName(spriteName) as PIXI.Sprite;
    if (!original) {
      return;
    }

    const sprite = new PIXI.Sprite(original.texture);
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

    const oldSprite = this.viewport.getChildByName(String(id)) as PIXI.Sprite;
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
    let object = this.viewport.getChildByName(spriteName) as PIXI.Sprite;
    if (!object) {
      object = new PIXI.Sprite(this.getGroupSprite(group));
      object.name = spriteName;
      object.scale = new PIXI.Point(0.5, 0.5);
      this.viewport.addChild(object);
    }

    object.x = this.layout.hexToPixel(group.pos).x - this.HEX_SIZE / 3;
    object.y = this.layout.hexToPixel(group.pos).y + this.HEX_SIZE / 3;
    object.zIndex = ZIndices.Units;

    // Update movement indicator
    const oldSprite = this.viewport.getChildByName(
      "MovementIndicator"
    ) as PIXI.Graphics;
    if (oldSprite) {
      this.viewport.removeChild(oldSprite);
    }

    if (uid && group.owner === uid) {
      const movementIndicatorContainer = new PIXI.Container();
      movementIndicatorContainer.name = "MovementIndicator";
      movementIndicatorContainer.zIndex = ZIndices.Units;

      this.viewport.addChild(movementIndicatorContainer);

      for (const hex of group.targetHexes) {
        const indicator = new PIXI.Graphics();
        indicator.beginFill(0x0000ff);
        indicator.drawCircle(5, 5, 5);
        indicator.endFill();
        indicator.x = this.layout.hexToPixel(hex).x - this.HEX_SIZE / 3;
        indicator.y = this.layout.hexToPixel(hex).y + this.HEX_SIZE / 3;
        indicator.alpha = 0.7;

        movementIndicatorContainer.addChild(indicator);
      }
      movementIndicatorContainer.calculateBounds();
    }
  }

  updateScenegraphBuilding(building: Building): void {
    if (!this.viewport) return;

    const spriteName = convertToSpriteName(building.id, "b");
    let object = this.viewport.getChildByName(spriteName) as PIXI.Sprite;
    if (!object) {
      object = new PIXI.Sprite(this.getBuildingSprite(building));
      object.name = spriteName;
      object.scale = new PIXI.Point(0.5, 0.5);
      this.viewport.addChild(object);
    }

    object.x = this.layout.hexToPixel(building.pos).x - this.HEX_SIZE / 3;
    object.y = this.layout.hexToPixel(building.pos).y + this.HEX_SIZE / 3;
    object.zIndex = ZIndices.Buildings;
  }

  updateScenegraphTile(tile: ClientTile): void {
    if (!this.viewport) return;

    const spriteName = convertToSpriteName(tile.id, "t");
    let object = this.viewport.getChildByName(spriteName) as PIXI.Sprite;
    if (!object) {
      object = new PIXI.Sprite(this.getTerrainTexture(tile));
      object.name = spriteName;
      this.viewport.addChild(object);
    }

    object.x = this.layout.hexToPixel(tile).x - this.HEX_SIZE;
    object.y = this.layout.hexToPixel(tile).y - this.HEX_SIZE;
    object.zIndex = ZIndices.Tiles;
    object.visible = tile.visible;
  }

  findSpritesAtPoint(point: {
    x: number;
    y: number;
  }): Array<PIXI.DisplayObject> {
    if (!this.viewport) return [];

    const found: Array<PIXI.DisplayObject> = [];
    const hexCoord = this.layout.pixelToHex(point);

    this.viewport.children.forEach((child) => {
      // Skip non-sprite objects or objects without a name
      if (!child.name) return;

      // Check if this is a tile, group, or building by name prefix
      const prefix = child.name.charAt(0);
      if (prefix === "t" || prefix === "g" || prefix === "b") {
        const childHex = this.getHexFromSprite(child);
        if (childHex && Hex.equals(childHex, hexCoord)) {
          found.push(child);
        }
      }
    });

    return found;
  }

  private getHexFromSprite(sprite: PIXI.DisplayObject): Hex | null {
    // Extract the ID from the sprite name (format is "prefix_id")
    const parts = sprite.name.split("_");
    if (parts.length !== 2) return null;

    const prefix = parts[0];
    const id = parseInt(parts[1]);

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
    this.viewport.center = new PIXI.Point(x, y);
  }

  centerOn(pos: Hex): void {
    if (!this.viewport) return;
    const point = this.layout.hexToPixel(pos);
    this.viewport.moveCenter(new PIXI.Point(point.x, point.y));
  }

  // Helper methods for textures and sprites
  private getTerrainTexture(tile: ClientTile): PIXI.Texture {
    const biomeMap: Record<Biome, { name: string; variants: number }> = {
      [Biome.Ice]: { name: "biome_ice", variants: 1 },
      [Biome.Tundra]: { name: "biome_tundra", variants: 8 },
      [Biome.BorealForest]: { name: "biome_boreal", variants: 8 },
      [Biome.Grassland]: { name: "biome_grassland", variants: 8 },
      [Biome.TemperateForest]: { name: "biome_forest", variants: 8 },
      [Biome.Jungle]: { name: "biome_jungle", variants: 8 },
      [Biome.Savanna]: { name: "biome_savanna", variants: 8 },
      [Biome.Desert]: { name: "biome_desert", variants: 8 },
      [Biome.Ocean]: { name: "biome_ocean", variants: 1 },
    };

    const biomeInfo = biomeMap[tile.biome] || biomeMap[Biome.Ice];
    return this.getRandomTile(tile, biomeInfo.name, biomeInfo.variants);
  }

  private getRandomTile(
    tile: ClientTile,
    name: string,
    max: number
  ): PIXI.Texture {
    if (max <= 1) {
      return Loader.shared.resources[name].texture;
    }

    // Ensure we get a stable "random" result by using the tile id
    const variant = (Math.abs(tile.id) % max) + 1;
    const textureName = `${name}_${variant}`;

    // Return the texture with variant if it exists, otherwise the base texture
    return (
      Loader.shared.resources[textureName]?.texture ||
      Loader.shared.resources[name].texture
    );
  }

  private getBuildingSprite(building: Building): PIXI.Texture {
    const buildingTemplate = Buildings.find((b) => b.type === building.type);
    const spriteName = buildingTemplate?.sprite || "building_unknown";

    return (
      Loader.shared.resources[spriteName]?.texture ||
      Loader.shared.resources["building_unknown"].texture
    );
  }

  private getGroupSprite(group: Group): PIXI.Texture {
    // Based on group owner, return different sprites - simplified here
    const suffix = group.owner === "ai" ? "_ai" : "";
    const textureName = `group${suffix}`;

    return (
      Loader.shared.resources[textureName]?.texture ||
      Loader.shared.resources["group"].texture
    );
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
      this.app.destroy(false);
      this.app = null;
    }

    this.viewport = null;
    this.viewportReady = false;
    this.initialFocusSet = false;
  }
}
