import { Texture, Assets } from "pixi.js";
import { Biome, Building } from "@shared/objects";
import Buildings from "@shared/templates/buildings.json";
import { ClientTile } from "./types";

// Define the type for the modules loaded by import.meta.glob
interface AssetModule {
  default: string;
}

export class SpriteManager {
  private textures: Map<string, Texture> = new Map();

  constructor() {}

  /**
   * Load all textures from the assets directory using Vite's import.meta.glob
   */
  async loadTextures(): Promise<void> {
    // Clear existing textures
    this.textures.clear();

    // Use import.meta.glob to find all .png files in src/assets
    const imageModules = import.meta.glob<AssetModule>("/src/assets/**/*.png", {
      eager: true,
    });

    const assetBundles: Record<string, string> = {};

    // Create a mapping of texture keys to asset URLs
    for (const path in imageModules) {
      const url = imageModules[path].default;
      const key = path.split("/").pop()?.replace(".png", "");
      if (key) {
        assetBundles[key] = url;
      }
    }

    // Add all assets to PixiJS Assets
    Assets.addBundle("textures", assetBundles);

    // Load all textures in the bundle
    const loadedTextures = await Assets.loadBundle("textures");

    // Store the loaded textures in our textures map
    for (const [key, texture] of Object.entries(loadedTextures)) {
      this.textures.set(key, texture as Texture);
      console.log(`Loaded texture: ${key}`);
    }

    return Promise.resolve();
  }

  /**
   * Get a texture by key and optional variant
   */
  getTexture(key: string, variant: number = 1): Texture {
    const textureKey = variant > 1 ? `${key}_${variant}` : key;
    // Retrieve texture directly from the map
    const texture = this.textures.get(textureKey);

    if (!texture) {
      console.warn(`Texture not found: ${textureKey}, using fallback`);
      // Fallback logic remains the same, but ensure 'biome_ice' exists in the map
      const fallbackTexture = this.textures.get("biome_ice");
      if (!fallbackTexture) {
        console.error("Fallback texture 'biome_ice' not found!");
        // Return a default empty texture
        return Texture.EMPTY;
      }
      return fallbackTexture;
    }

    return texture;
  }

  /**
   * Get a terrain texture based on biome
   */
  getTerrainTexture(tile: ClientTile): Texture {
    const biomeMap: Record<number, { name: string; variants: number }> = {
      [Biome.Ice]: { name: "biome_ice", variants: 1 },
      [Biome.Tundra]: { name: "biome_tundra", variants: 8 },
      [Biome.Boreal]: { name: "biome_boreal_forest", variants: 4 },
      [Biome.Grassland]: { name: "biome_grassland", variants: 2 },
      [Biome.Temperate]: { name: "biome_temperate_forest", variants: 4 },
      [Biome.Tropical]: { name: "biome_tropical_forest", variants: 2 },
      [Biome.Desert]: { name: "biome_desert", variants: 8 },
      [Biome.Ocean]: { name: "biome_ocean", variants: 1 },
      [Biome.None]: { name: "biome_ice", variants: 1 }, // Default fallback
      [Biome.Shore]: { name: "biome_shore", variants: 1 },
      [Biome.Treeline]: { name: "biome_tree_line", variants: 3 },
      [Biome.Mountain]: { name: "biome_mountain", variants: 4 },
      [Biome.Beach]: { name: "biome_beach", variants: 1 },
      [Biome.Peaks]: { name: "biome_ice_peaks", variants: 3 },
      [Biome.River]: { name: "biome_river", variants: 1 },
    };

    const biomeInfo = biomeMap[tile.biome] || biomeMap[Biome.Ice]; // Use Ice as fallback
    return this.getRandomTile(tile, biomeInfo.name, biomeInfo.variants);
  }

  /**
   * Get a random tile texture variant based on tile coordinates
   * This ensures the same tile always gets the same texture variant
   */
  private getRandomTile(tile: ClientTile, name: string, max: number): Texture {
    if (max <= 1) {
      return this.getTexture(name); // No suffix if max is 1
    }

    // Use the tile's hex coordinates for consistent variant selection
    // A simple hash function using the hex q and r coordinates
    const hash = Math.abs(tile.hex.q * 31 + tile.hex.r);
    const variant = (hash % max) + 1;

    return this.getTexture(name, variant);
  }

  /**
   * Get a building sprite based on building type
   */
  getBuildingSprite(building: Building): Texture {
    const buildingKey = building.key;
    const buildingData = Buildings[buildingKey as keyof typeof Buildings];
    // Ensure texture names match files in assets, e.g., 'town_center' instead of 'building_town_center'
    const spriteName = buildingData?.texture || "fallback_building"; // Use a generic fallback key
    const texture = this.textures.get(spriteName);

    if (!texture) {
      console.warn(`Building texture not found: ${spriteName}, using fallback`);
      // Provide a default texture if available, e.g., the fallback 'biome_ice' or a specific 'unknown_building' texture
      return this.textures.get("biome_ice") || Texture.EMPTY;
    }
    return texture;
  }

  /**
   * Get a group sprite based on owner
   */
  getGroupSprite(owner: string): Texture {
    // Assuming group sprites are named like 'unit_scout_own', 'unit_scout_enemy' etc.
    // This method might need adjustment based on actual group sprite naming convention
    const suffix = owner === "ai" ? "_enemy" : "_own"; // Example adjustment
    const baseName = "unit_scout"; // Example base name, adjust as needed
    const textureName = `${baseName}${suffix}`;

    const texture = this.textures.get(textureName);
    if (!texture) {
      console.warn(`Group texture not found: ${textureName}, using fallback`);
      return this.textures.get("biome_ice") || Texture.EMPTY; // Fallback
    }
    return texture;
  }
}
