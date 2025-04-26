import * as PIXI from "pixi.js";
import { Loader } from "pixi.js";
import { Biome, Building } from "@shared/objects";
import Sprites from "./sprites.json";
import Buildings from "@shared/templates/buildings.json";
import { ClientTile } from "./types";

export class SpriteManager {
  private textures: Map<string, PIXI.Texture> = new Map();

  constructor() {}

  /**
   * Load all textures defined in sprites.json
   */
  async loadTextures(): Promise<void> {
    PIXI.utils.clearTextureCache();
    Loader.shared.reset();

    for (const sprite of Sprites) {
      Loader.shared.add(sprite, `../${sprite}.png`);
    }

    return new Promise<void>((resolve) => {
      Loader.shared.load(() => {
        for (const sprite of Sprites) {
          this.textures.set(sprite, Loader.shared.resources[sprite].texture);
        }
        resolve();
      });
    });
  }

  /**
   * Get a texture by key and optional variant
   */
  getTexture(key: string, variant: number = 1): PIXI.Texture {
    const textureKey = variant > 1 ? `${key}_${variant}` : key;
    const texture = Loader.shared.resources[textureKey]?.texture;

    if (!texture) {
      console.warn(`Texture not found: ${textureKey}, using fallback`);
      return Loader.shared.resources["biome_ice"].texture;
    }

    return texture;
  }

  /**
   * Get a terrain texture based on biome
   */
  getTerrainTexture(tile: ClientTile): PIXI.Texture {
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

  /**
   * Get a random tile texture variant based on tile ID
   */
  private getRandomTile(
    tile: ClientTile,
    name: string,
    max: number
  ): PIXI.Texture {
    if (max <= 1) {
      return this.getTexture(name);
    }

    // Ensure we get a stable "random" result by using the tile id
    const variant = (Math.abs(tile.id) % max) + 1;
    return this.getTexture(name, variant);
  }

  /**
   * Get a building sprite based on building type
   */
  getBuildingSprite(building: Building): PIXI.Texture {
    const buildingTemplate = Buildings.find((b) => b.type === building.type);
    const spriteName = buildingTemplate?.sprite || "building_unknown";

    return this.getTexture(spriteName);
  }

  /**
   * Get a group sprite based on owner
   */
  getGroupSprite(owner: string): PIXI.Texture {
    // Based on group owner, return different sprites
    const suffix = owner === "ai" ? "_ai" : "";
    const textureName = `group${suffix}`;

    return this.getTexture(textureName);
  }
}
