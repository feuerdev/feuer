import { Biome, Building } from "@shared/objects";
import Buildings from "@shared/templates/buildings.json";
import { ClientTile } from "./types";

function getRandomTile(tile: ClientTile, name: string, max: number): string {
  if (max <= 1) {
    return name; // No suffix if max is 1
  }

  // Use the tile's hex coordinates for consistent variant selection
  const hash = Math.abs(tile.hex.q * 31 + tile.hex.r);
  const variant = (hash % max) + 1;

  return `${name}_${variant}`;
}

/**
 * Get a terrain texture based on biome
 */
export function getTerrainTexture(tile: ClientTile): string {
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
  return getRandomTile(tile, biomeInfo.name, biomeInfo.variants);
}

/**
 * Get a building sprite based on building type
 */
export function getBuildingSprite(building: Building): string {
  const buildingKey = building.key;
  const buildingData = Buildings[buildingKey as keyof typeof Buildings];
  return buildingData?.texture || "fallback_building";
}

/**
 * Get a group sprite based on owner
 */
export function getGroupSprite(owner: string): string {
  // Assuming group sprites are named like 'unit_scout_own', 'unit_scout_enemy' etc.
  // This method might need adjustment based on actual group sprite naming convention
  const suffix = owner === "ai" ? "_enemy" : "_own"; // Example adjustment
  const baseName = "unit_scout"; // Example base name, adjust as needed
  return `${baseName}${suffix}`;
}

