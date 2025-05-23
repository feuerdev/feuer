import { Biome, Building } from "@shared/objects";
import { ClientTile } from "./types";
import { EnumRelationType } from "@shared/relation";
import { Graphics, Text } from "pixi.js";

/**
 * Biome color mapping
 */
export const BIOME_COLORS: Record<number, number> = {
  [Biome.None]: 0x999999, // Gray
  [Biome.Ice]: 0xeeffff, // White/light blue
  [Biome.Tundra]: 0xdddddd, // Light gray
  [Biome.Boreal]: 0x557755, // Dark green
  [Biome.Grassland]: 0x88aa55, // Light green
  [Biome.Temperate]: 0x338833, // Medium green
  [Biome.Tropical]: 0x227722, // Dark saturated green
  [Biome.Desert]: 0xddcc77, // Sand yellow
  [Biome.Ocean]: 0x3388cc, // Medium blue
  [Biome.Shore]: 0x66aadd, // Light blue
  [Biome.Treeline]: 0x667755, // Gray-green
  [Biome.Mountain]: 0x777777, // Medium gray
  [Biome.Beach]: 0xeedd88, // Light sand
  [Biome.Peaks]: 0xffffff, // White
  [Biome.River]: 0x44aaff, // Light blue
};

/**
 * Player relation color mapping
 */
export const RELATION_COLORS: Record<string | number, number> = {
  [EnumRelationType.neutral]: 0xffcc33, // Yellow
  [EnumRelationType.friendly]: 0x33cc33, // Green
  [EnumRelationType.hostile]: 0xcc3333, // Red
  own: 0x3399ff, // Blue for own units
};

/**
 * Building type color mapping
 */
export const BUILDING_COLORS: Record<string, number> = {
  towncenter: 0x9966cc, // Purple
  campsite: 0x77aadd, // Light blue
  wood: 0x338833, // Green
  stone: 0x777777, // Gray
  iron: 0x555577, // Dark gray
  gold: 0xffdd33, // Gold
  default: 0xaaaaaa, // Medium gray
};

/**
 * Resource type color mapping
 */
export const RESOURCE_COLORS: Record<string, number> = {
  wood: 0x8b4513, // Brown
  stone: 0x808080, // Gray
  iron: 0xa19d94, // Silver
  gold: 0xffd700, // Gold
  berries: 0xcc3366, // Pink
  fish: 0x66ccff, // Light blue
  meat: 0xcc6633, // Orange-brown
  wheat: 0xddcc55, // Yellow
  default: 0xffffff, // White
};

/**
 * Draw terrain graphics onto the provided graphics object
 */
export function drawTerrainGraphics(
  graphics: Graphics,
  tile: ClientTile
): void {
  const biomeColor = BIOME_COLORS[tile.biome] || BIOME_COLORS[Biome.None];

  // Add some variance to the color based on tile properties
  const heightFactor = Math.min(1, Math.max(0, tile.height));
  const temperatureFactor = Math.min(
    1,
    Math.max(0, (tile.temperature + 10) / 30)
  );
  const precipitationFactor = Math.min(1, Math.max(0, tile.precipitation));

  // Slightly adjust color based on factors (subtly)
  let color = biomeColor;
  // Darken for height
  if (heightFactor > 0.6) {
    color = adjustColor(color, -20, -20, -20);
  }
  // Yellow tint for hot areas
  if (temperatureFactor > 0.7) {
    color = adjustColor(color, 15, 5, -10);
  }
  // Darken and saturate for precipitation
  if (precipitationFactor > 0.6) {
    color = adjustColor(color, -5, 0, 15);
  }

  // Draw filled hexagon (will be replaced with actual corners in Engine.ts)
  graphics.clear();
  graphics.beginFill(color);
  graphics.lineStyle(1, 0x000000, 0.3);
  // Initial dummy polygon that will be replaced
  graphics.drawPolygon([0, 0]);
  graphics.endFill();
}

/**
 * Draw building graphics onto the provided graphics object
 */
export function drawBuildingGraphics(
  graphics: Graphics,
  building: Building
): void {
  // Determine building color
  const buildingColor =
    BUILDING_COLORS[building.key] || BUILDING_COLORS.default;

  // Draw building as a simple square with a symbol
  graphics.clear();
  graphics.beginFill(buildingColor);
  graphics.lineStyle(2, 0x000000, 0.7);

  // Make the building slightly larger based on level
  const size = 15 + (building.level - 1) * 3;
  graphics.drawRect(-size, -size, size * 2, size * 2);
  graphics.endFill();

  // Add level indicator dots at the bottom of the building
  const dotRadius = 2;
  const dotSpacing = 5;
  const startX = -((building.level - 1) * dotSpacing) / 2;

  graphics.beginFill(0xffffff); // White dots
  for (let i = 0; i < building.level; i++) {
    graphics.drawCircle(startX + i * dotSpacing, size + 5, dotRadius);
  }
  graphics.endFill();

  // Add empty dots for remaining levels
  if (building.level < building.maxLevel) {
    graphics.beginFill(0x666666); // Gray dots for remaining levels
    for (let i = building.level; i < building.maxLevel; i++) {
      graphics.drawCircle(startX + i * dotSpacing, size + 5, dotRadius);
    }
    graphics.endFill();
  }

  // Add a symbol or letter based on building type
  graphics.lineStyle(2, 0xffffff);

  switch (building.key) {
    case "towncenter":
    case "campsite":
      // Draw a simple house shape
      graphics.moveTo(-size * 0.6, size * 0.3);
      graphics.lineTo(-size * 0.6, -size * 0.2);
      graphics.lineTo(0, -size * 0.7);
      graphics.lineTo(size * 0.6, -size * 0.2);
      graphics.lineTo(size * 0.6, size * 0.3);
      graphics.lineTo(-size * 0.6, size * 0.3);
      break;
    case "wood":
      // Draw a tree shape
      graphics.moveTo(0, -size * 0.7);
      graphics.lineTo(size * 0.4, 0);
      graphics.lineTo(size * 0.2, 0);
      graphics.lineTo(size * 0.4, size * 0.5);
      graphics.lineTo(-size * 0.4, size * 0.5);
      graphics.lineTo(-size * 0.2, 0);
      graphics.lineTo(-size * 0.4, 0);
      graphics.lineTo(0, -size * 0.7);
      break;
    case "stone":
    case "iron":
    case "gold":
      // Draw a simple mine shape (mountain)
      graphics.moveTo(-size * 0.6, size * 0.3);
      graphics.lineTo(-size * 0.2, -size * 0.3);
      graphics.lineTo(0, 0);
      graphics.lineTo(size * 0.2, -size * 0.5);
      graphics.lineTo(size * 0.6, size * 0.3);
      graphics.lineTo(-size * 0.6, size * 0.3);
      break;
    default:
      // Just add a visible letter B for the default case
      graphics.beginFill(0xffffff);
      graphics.drawCircle(0, 0, 5);
      graphics.endFill();
      break;
  }
}

/**
 * Helper function to add text to a building if needed
 * Should be called after drawBuildingGraphics
 */
export function addBuildingText(text: Text, building: Building): void {
  // Always show building level
  text.text = `${building.key.charAt(0).toUpperCase()}${building.level}`;
  text.style = {
    fontSize: 12,
    fill: 0xffffff,
    stroke: {
      color: 0x000000,
      width: 2,
    },
    align: "center",
  };
  text.anchor.set(0.5);
  text.y = -20; // Position above the building
  text.visible = true;
}

/**
 * Draw unit graphics onto the provided graphics object
 */
export function drawGroupGraphics(
  graphics: Graphics,
  owner: string,
  ownerId: string,
  relationtype?: number
): void {
  // Determine color based on relation
  let color: number;
  if (owner === ownerId) {
    color = RELATION_COLORS["own"];
  } else if (relationtype !== undefined) {
    color =
      RELATION_COLORS[relationtype] ||
      RELATION_COLORS[EnumRelationType.neutral];
  } else {
    color = RELATION_COLORS[EnumRelationType.neutral];
  }

  graphics.clear();

  // Draw unit as a small square with a colored "head"
  // Body
  graphics.beginFill(0x333333);
  graphics.lineStyle(1, 0x000000);
  graphics.drawRect(-7, -5, 14, 15);
  graphics.endFill();

  // Head (colored based on relation)
  graphics.beginFill(color);
  graphics.lineStyle(1, 0x000000);
  graphics.drawCircle(0, -10, 7);
  graphics.endFill();

  // Add simple legs
  graphics.lineStyle(2, 0x333333);
  graphics.moveTo(-5, 10);
  graphics.lineTo(-5, 15);
  graphics.moveTo(5, 10);
  graphics.lineTo(5, 15);
}

/**
 * Create resource generation indicator
 * @param graphics The graphics object to draw on
 * @param resourceType The type of resource being generated
 * @param amount The amount being generated (affects size)
 * @param animationProgress Progress of the animation (0-1)
 */
export function drawResourceGenerationIndicator(
  graphics: Graphics,
  resourceType: string,
  amount: number,
  animationProgress: number
): void {
  const color = RESOURCE_COLORS[resourceType] || RESOURCE_COLORS.default;

  // Clear previous graphics
  graphics.clear();

  // Calculate size based on amount (with minimum and maximum)
  const baseSize = 3;
  const sizeMultiplier = Math.min(5, Math.max(1, Math.log10(amount) + 1));
  const size = baseSize * sizeMultiplier;

  // Draw resource particle
  graphics.beginFill(color);
  graphics.lineStyle(1, 0x000000, 0.5);

  // Different shapes for different resource types
  switch (resourceType) {
    case "wood":
      // Rectangle for wood
      graphics.drawRect(-size / 2, -size / 2, size, size);
      break;
    case "stone":
    case "iron": {
      // Pentagon for minerals
      const points = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        points.push(Math.cos(angle) * size);
        points.push(Math.sin(angle) * size);
      }
      graphics.drawPolygon(points);
      break;
    }
    case "gold":
      // Star for gold
      graphics.drawStar(0, 0, 5, size, size / 2);
      break;
    case "berries":
    case "fish":
    case "meat":
    case "wheat":
      // Circle for food
      graphics.drawCircle(0, 0, size);
      break;
    default:
      // Default is a circle
      graphics.drawCircle(0, 0, size);
  }

  graphics.endFill();

  // Set alpha based on animation progress
  graphics.alpha = 1 - animationProgress;
}

/**
 * Helper function to adjust a color
 */
function adjustColor(
  color: number,
  rDiff: number,
  gDiff: number,
  bDiff: number
): number {
  // Extract RGB components
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  // Adjust components with clamping
  const newR = Math.min(255, Math.max(0, r + rDiff));
  const newG = Math.min(255, Math.max(0, g + gDiff));
  const newB = Math.min(255, Math.max(0, b + bDiff));

  // Recombine and return
  return (newR << 16) | (newG << 8) | newB;
}
