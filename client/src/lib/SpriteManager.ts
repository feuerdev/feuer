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
          const texture = Loader.shared.resources[sprite]?.texture;
          if (texture) {
            this.textures.set(sprite, texture);
          }
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
      const fallbackTexture = Loader.shared.resources["biome_ice"]?.texture;
      return fallbackTexture as PIXI.Texture;
    }

    return texture;
  }

  /**
   * Get a terrain texture based on biome
   */
  getTerrainTexture(tile: ClientTile): PIXI.Texture {
    const biomeMap: Record<number, { name: string; variants: number }> = {
      [Biome.Ice]: { name: "biome_ice", variants: 1 },
      [Biome.Tundra]: { name: "biome_tundra", variants: 8 },
      [Biome.Boreal]: { name: "biome_boreal", variants: 8 },
      [Biome.Grassland]: { name: "biome_grassland", variants: 8 },
      [Biome.Temperate]: { name: "biome_forest", variants: 8 },
      [Biome.Tropical]: { name: "biome_jungle", variants: 8 },
      [Biome.Desert]: { name: "biome_desert", variants: 8 },
      [Biome.Ocean]: { name: "biome_ocean", variants: 1 },
      [Biome.None]: { name: "biome_ice", variants: 1 },
      [Biome.Shore]: { name: "biome_ocean", variants: 1 },
      [Biome.Treeline]: { name: "biome_forest", variants: 8 },
      [Biome.Mountain]: { name: "biome_tundra", variants: 8 },
      [Biome.Beach]: { name: "biome_desert", variants: 8 },
      [Biome.Peaks]: { name: "biome_tundra", variants: 8 },
      [Biome.River]: { name: "biome_ocean", variants: 1 },
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

    const variant = (Math.abs(tile.id) % max) + 1;
    return this.getTexture(name, variant);
  }

  /**
   * Get a building sprite based on building type
   */
  getBuildingSprite(building: Building): PIXI.Texture {
    const buildingKey = building.key;
    const buildingData = Buildings[buildingKey as keyof typeof Buildings];
    const spriteName = buildingData?.texture || "building_unknown";

    return this.getTexture(spriteName);
  }

  /**
   * Get a group sprite based on owner
   */
  getGroupSprite(owner: string): PIXI.Texture {
    const suffix = owner === "ai" ? "_ai" : "";
    const textureName = `group${suffix}`;

    return this.getTexture(textureName);
  }
}
