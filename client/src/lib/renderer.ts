import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";
import * as PIXI from "pixi.js";
import { Layout, Hex } from "@shared/hex";
import * as Vector2 from "@shared/vector2";
import Rules from "@shared/rules.json";
import { ClientTile, Selection, SelectionType, ZIndices } from "./types";
import { Biome, Building, Group } from "@shared/objects";
import { Filter, Loader } from "pixi.js";
import Sprites from "./sprites.json";
import Buildings from "@shared/templates/buildings.json";
import { convertToSpriteName } from "@shared/util";
import { uid } from "./game";

const HEX_SIZE = 40;

export const loadTextures = () => {
  PIXI.utils.clearTextureCache();
  Loader.shared.reset();
  for (const sprite of Sprites) {
    Loader.shared.add(sprite, `../${sprite}.png`);
  }

  return new Promise<void>((resolve) => {
    Loader.shared.load(() => resolve());
  });
};

export const layout: Layout = new Layout(
  Layout.pointy,
  Vector2.create(HEX_SIZE, HEX_SIZE),
  Vector2.create(0, 0)
);

// Zoom to the first group received
let initialFocusSet = false;

const GLOWFILTER: Filter = new GlowFilter({
  distance: 30,
  outerStrength: 2,
  color: 0x000000,
}) as unknown as Filter;

// We'll create the viewport in startRenderer when we have the actual dimensions
let viewport: Viewport;
let pixi: PIXI.Application | null = null;
let viewportReady = false;

export const startRenderer = (canvas: HTMLCanvasElement) => {
  // First clean up any existing renderer
  stopRenderer();
  viewportReady = false;

  // Create a PIXI Application
  pixi = new PIXI.Application({
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

  // Create the viewport using the application's screen dimensions
  viewport = new Viewport({
    screenWidth: pixi.screen.width,
    screenHeight: pixi.screen.height,
    worldWidth: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
    worldHeight: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
    // This is crucial - use the application's interaction manager
    interaction: pixi.renderer.plugins.interaction,
  });

  // Add the viewport to the stage
  pixi.stage.addChild(viewport);

  const resizeHandler = () => {
    if (!pixi) return;

    pixi.renderer.resize(window.innerWidth, window.innerHeight);

    // Update viewport dimensions on resize
    viewport.screenWidth = pixi.screen.width;
    viewport.screenHeight = pixi.screen.height;
    viewport.resize(pixi.screen.width, pixi.screen.height);
  };

  window.addEventListener("resize", resizeHandler);

  // Configure the viewport for user interaction
  viewport.sortableChildren = true;
  viewport
    .clampZoom({
      maxScale: 2,
      minScale: 0.2,
    })
    .drag()
    .pinch()
    .wheel()
    .decelerate();

  viewportReady = true;
};

export const stopRenderer = () => {
  if (pixi) {
    // Don't pass true to destroy() so it won't remove the canvas
    pixi.destroy(false);
    pixi = null;
  }

  viewportReady = false;
  // Remove resize event listeners
  window.removeEventListener("resize", () => {});
};

// New function to check if viewport is ready
export const isViewportReady = () => viewportReady;

// Function to register a viewport click handler that can be called from game.ts
export const registerViewportClickHandler = (
  clickHandler: (point: { x: number; y: number }, button: number) => void
): boolean => {
  if (!viewport || !viewportReady) {
    console.warn("Viewport not initialized - click handler not set");
    return false;
  }

  viewport.on("clicked", (click) => {
    clickHandler(
      { x: click.world.x, y: click.world.y },
      click.event.data.button
    );
  });

  return true;
};

// Function to set up viewport click handlers (deprecated but kept for compatibility)
export const setupViewportClickHandlers = registerViewportClickHandler;

export const updateSelection = (selection: Selection) => {
  if (!viewport) return;

  const oldSprite = viewport.getChildByName("selection") as PIXI.Graphics;
  if (oldSprite) {
    viewport.removeChild(oldSprite);
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
  const original = viewport.getChildByName(spriteName) as PIXI.Sprite;
  if (!original) {
    return;
  }

  const sprite = new PIXI.Sprite(original.texture);
  sprite.name = "selection";
  viewport.addChild(sprite);

  sprite.position.set(original.position.x, original.position.y);
  sprite.zIndex = getSelectionZIndex(selection);
  sprite.width = original.width;
  sprite.height = original.height;

  sprite.filters = [GLOWFILTER];
};

export const removeItem = (id: number) => {
  if (!viewport) return;

  const oldSprite = viewport.getChildByName(String(id)) as PIXI.Sprite;
  if (oldSprite) {
    viewport.removeChild(oldSprite);
  }
};

export const updateScenegraphGroup = (group: Group) => {
  if (!viewport) return;

  if (!initialFocusSet) {
    initialFocusSet = true;
    centerOn(group.pos);
  }

  const spriteName = convertToSpriteName(group.id, "g");
  let object = viewport.getChildByName(spriteName) as PIXI.Sprite;
  if (!object) {
    object = new PIXI.Sprite(getGroupSprite(group));
    object.name = spriteName;
    object.scale = new PIXI.Point(0.5, 0.5);
    viewport.addChild(object);
  }

  object.x = layout.hexToPixel(group.pos).x - HEX_SIZE / 3;
  object.y = layout.hexToPixel(group.pos).y + HEX_SIZE / 3;
  object.zIndex = ZIndices.Units;

  // Update movement indicator
  const oldSprite = viewport.getChildByName(
    "MovementIndicator"
  ) as PIXI.Graphics;
  if (oldSprite) {
    viewport.removeChild(oldSprite);
  }

  if (group.owner === uid) {
    const movementIndicatorContainer = new PIXI.Container();
    movementIndicatorContainer.name = "MovementIndicator";
    movementIndicatorContainer.zIndex = ZIndices.Units;

    viewport.addChild(movementIndicatorContainer);

    for (const hex of group.targetHexes) {
      const indicator = new PIXI.Graphics();
      indicator.beginFill(0x0000ff);
      indicator.drawCircle(5, 5, 5);
      indicator.endFill();
      indicator.x = layout.hexToPixel(hex).x - HEX_SIZE / 3;
      indicator.y = layout.hexToPixel(hex).y + HEX_SIZE / 3;
      indicator.alpha = 0.7;

      movementIndicatorContainer.addChild(indicator);
    }
    movementIndicatorContainer.calculateBounds();
  }
};

export const updateScenegraphBuilding = (building: Building) => {
  if (!viewport) return;

  const spriteName = convertToSpriteName(building.id, "b");
  let object = viewport.getChildByName(spriteName) as PIXI.Sprite;
  if (!object) {
    object = new PIXI.Sprite(getBuildingSprite(building));
    object.name = spriteName;
    object.scale = new PIXI.Point(0.5, 0.5);
    viewport.addChild(object);
  }

  object.x = layout.hexToPixel(building.position).x - HEX_SIZE / 3 + 5;
  object.y = layout.hexToPixel(building.position).y + HEX_SIZE / 3 - 5;
  object.zIndex = ZIndices.Buildings;
};

export const updateScenegraphTile = (tile: ClientTile) => {
  if (!viewport) return;

  const spriteName = convertToSpriteName(tile.id, "t");
  let object = viewport.getChildByName(spriteName) as PIXI.Sprite;
  if (!object) {
    object = new PIXI.Sprite(getTerrainTexture(tile));
    viewport.addChild(object);

    const corners = layout.polygonCorners(tile.hex);
    const padding = 2; // "black" space between tiles

    object.zIndex = ZIndices.Tiles;
    object.name = spriteName;
    object.x = corners[3].x + padding; //obere linke ecke
    object.y = corners[3].y - layout.size.y / 2 + padding; //obere linke ecke- halbe höhe
    object.width = layout.size.x * Math.sqrt(3) - padding;
    object.height = layout.size.y * 2 + 1 - padding;
  }

  const tint = tile.visible ? 0xdddddd : 0x555555;

  object.tint = tint;
};

const centerOn = (pos: Hex) => {
  if (!viewport) return;

  const x = layout.hexToPixel(pos).x;
  const y = layout.hexToPixel(pos).y;
  viewport.center = new PIXI.Point(x, y);
};

const getTerrainTexture = (tile: ClientTile) => {
  switch (tile.biome) {
    case Biome.Ice:
      return getRandomTile(tile, "biome_ice", 1);
    case Biome.Tundra:
      return getRandomTile(tile, "biome_tundra", 8);
    case Biome.Boreal:
      return getRandomTile(tile, "biome_boreal_forest", 4);
    case Biome.Temperate:
      return getRandomTile(tile, "biome_temperate_forest", 4);
    case Biome.Tropical:
      return getRandomTile(tile, "biome_tropical_forest", 2);
    case Biome.Grassland:
      return getRandomTile(tile, "biome_grassland", 2);
    case Biome.Desert:
      return getRandomTile(tile, "biome_desert", 8);
    case Biome.Ocean:
      return getRandomTile(tile, "biome_ocean", 1);
    case Biome.Shore:
      return getRandomTile(tile, "biome_shore", 1);
    case Biome.Treeline:
      return getRandomTile(tile, "biome_tree_line", 3);
    case Biome.Mountain:
      return getRandomTile(tile, "biome_mountain", 4);
    case Biome.Beach:
      return getRandomTile(tile, "biome_beach", 1);
    case Biome.Peaks:
      return getRandomTile(tile, "biome_ice_peaks", 3);
    case Biome.River:
      return getRandomTile(tile, "biome_river", 1);
    default:
      return getRandomTile(tile, "biome_ice", 1);
  }
};

const getRandomTile = (tile: ClientTile, name: string, max: number) => {
  //Hash a random number between 0 and max based on the tile id (1 indexed)
  let texture: PIXI.Texture;
  if (max === 1) {
    texture = Loader.shared.resources[name].texture as PIXI.Texture;
  } else {
    const hash = (Math.abs(tile.id) % max) + 1;
    texture = Loader.shared.resources[`${name}_${hash}`]
      .texture as PIXI.Texture;
  }

  // Mirror the texture if id is even for more diversity
  if (Math.abs(tile.hex.s) % 2 === 1) {
    texture = new PIXI.Texture(
      texture.baseTexture,
      texture.frame,
      texture.orig,
      texture.trim,
      12
    );
  }

  return texture;
};

const getBuildingSprite = (building: Building) => {
  const texture =
    Loader.shared.resources[
      Buildings[building.key as keyof typeof Buildings].texture
    ]?.texture;
  if (!texture) {
    console.warn("No texture found for building", building.key);
  }
  return texture;
};

const getGroupSprite = (group: Group) => {
  if (group.owner === uid) {
    return Loader.shared.resources["unit_scout_own"].texture;
  } else {
    return Loader.shared.resources["unit_scout_enemy"].texture;
  }
};

const getSelectionZIndex = (selection: Selection) => {
  if (selection.type === SelectionType.Group) {
    return ZIndices.UnitsSelection;
  } else if (selection.type === SelectionType.Building) {
    return ZIndices.BuildingsSelection;
  } else if (selection.type === SelectionType.Tile) {
    return ZIndices.TileSelection;
  } else {
    throw new Error("Unknown selection type");
  }
};

// Function to find sprites at a given point
export const findSpritesAtPoint = (point: { x: number; y: number }) => {
  if (!viewport) return [];

  return viewport.children.filter((sprite) => {
    const displayObject = sprite as PIXI.Sprite;
    if (!displayObject.width || !displayObject.height) return false;

    return (
      point.x >= displayObject.x &&
      point.x <= displayObject.x + displayObject.width &&
      point.y >= displayObject.y &&
      point.y <= displayObject.y + displayObject.height
    );
  });
};

// Add these viewport control functions
export const zoomIn = () => {
  if (!viewport) return;
  viewport.zoom(-200, true);
};

export const zoomOut = () => {
  if (!viewport) return;
  viewport.zoom(200, true);
};

export const resetZoom = () => {
  if (!viewport) return;
  viewport.setZoom(1, true);
};

export const centerViewport = (x = 0, y = 0) => {
  if (!viewport) return;
  viewport.center = new PIXI.Point(x, y);
};
