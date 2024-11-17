import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";
import * as PIXI from "pixi.js";
import { Layout, Hex } from "@shared/hex";
import * as Vector2 from "@shared/vector2";
import Rules from "@shared/rules.json";
import { ClientTile } from "./objects";
import { Biome, Building, Group } from "@shared/objects";
import { Filter, Loader } from "pixi.js";
import Sprites from "../game/sprites.json";
import Buildings from "@shared/templates/buildings.json";
import { convertToSpriteName } from "@shared/util";
import { Selection, SelectionType, uid } from "./game";

const HEX_SIZE = 40;

enum ZIndices {
  Background = 0,
  Tiles = 1,
  TileSelection = 2,
  Nature = 3,
  Buildings = 4,
  BuildingsSelection = 5,
  Units = 6,
  UnitsSelection = 7,
}

export const loadTextures = () => {
  const promise = new Promise<void>((resolve) => {
    PIXI.utils.clearTextureCache();
    Loader.shared.reset();
    for (const sprite of Sprites) {
      Loader.shared.add(sprite, `../img/${sprite}.png`);
    }

    function onDone() {
      resolve();
    }

    Loader.shared.load(onDone);
  });

  return promise;
};

const canvas_map = <HTMLCanvasElement>document.querySelector("canvas");

const pixi: PIXI.Renderer = new PIXI.Renderer({
  view: canvas_map,
  width: window.innerWidth,
  height: window.innerHeight,
  resolution: window.devicePixelRatio,
  autoDensity: true,
});

window.addEventListener("resize", () => {
  pixi.resize(window.innerWidth, window.innerHeight);
  if (viewport) {
    viewport.dirty = true;
  }
});

export const viewport: Viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
  worldHeight: (Rules.settings.map_size * 2 + 1) * HEX_SIZE,
  interaction: pixi.plugins.interaction, // the interaction module is important for wheel() to work properly when renderer.view is placed or scaled
})
  .clampZoom({
    maxScale: 2,
    minScale: 0.2,
  })
  .drag()
  .pinch()
  .wheel()
  .decelerate();

viewport.sortableChildren = true;

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

PIXI.Ticker.shared.add(() => {
  if (viewport?.dirty) {
    pixi.render(viewport);
    viewport.dirty = false;
  }
});

export const updateSelection = (selection: Selection) => {
  const oldSprite = viewport.getChildByName("selection") as PIXI.Graphics;
  viewport.removeChild(oldSprite);
  viewport.dirty = true;

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

  viewport.dirty = true;
};

export const removeItem = (id: number) => {
  const oldSprite = viewport.getChildByName(String(id)) as PIXI.Sprite;
  viewport.removeChild(oldSprite);
  viewport.dirty = true;
};

export const updateScenegraphGroup = (group: Group) => {
  if (!initialFocusSet) {
    initialFocusSet = true;
    centerOn(group.pos);
  }
  viewport.dirty = true;
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
  viewport.removeChild(oldSprite);

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
  viewport.dirty = true;

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
  viewport.dirty = true;

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
