import { Biome, Building } from "@shared/objects";
import { ClientTile, ZIndices } from "./types";
import { EnumRelationType } from "@shared/relation";
import { Graphics } from "pixi.js";

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
  building: Building,
  ownerId?: string,
  relationType?: number
): void {
  // Determine building color
  const buildingColor =
    BUILDING_COLORS[building.key] || BUILDING_COLORS.default;

  // Determine outline color based on relation
  let outlineColor = 0x000000; // Default black outline
  if (ownerId && building.owner === ownerId) {
    outlineColor = RELATION_COLORS["own"];
  } else if (relationType !== undefined) {
    outlineColor =
      RELATION_COLORS[relationType] ||
      RELATION_COLORS[EnumRelationType.neutral];
  } else {
    // If no ownerId or relationType, could be neutral or a generic color
    outlineColor = RELATION_COLORS[EnumRelationType.neutral]; // Default to neutral if unknown
  }

  // Draw building as a simple square with a symbol
  graphics.clear();
  graphics.beginFill(buildingColor);
  graphics.lineStyle(2, outlineColor, 0.7); // Use relation-based outline color

  // Make the building slightly larger based on level
  const size = 13 + (building.level - 1) * 3;
  graphics.drawRect(-size, -size, size * 2, size * 2);
  graphics.endFill();

  const slotGraphics = new Graphics();
  graphics.addChild(slotGraphics);

  // Add level indicator dots at the bottom of the building
  const dotRadius = 2;
  const dotSpacing = 5;

  // Calculate used and total slots
  const usedSlots = building.slots.filter(
    (slot) => slot.assignedGroupId !== undefined
  ).length;
  const totalSlots = building.slots.length;

  // Position dots in the bottom-left corner inside the building square
  const startX = -size + dotRadius + dotSpacing; // Offset from left edge
  const dotY = size - dotRadius - dotSpacing; // Offset from bottom edge

  // Draw filled dots for used slots
  slotGraphics.beginFill(0xffffff); // White dots for used slots
  for (let i = 0; i < usedSlots; i++) {
    slotGraphics.drawCircle(startX + i * dotSpacing, dotY, dotRadius);
  }
  slotGraphics.endFill();

  // Draw empty dots for remaining available slots
  if (usedSlots < totalSlots) {
    slotGraphics.beginFill(0x666666); // Gray dots for available slots
    for (let i = usedSlots; i < totalSlots; i++) {
      slotGraphics.drawCircle(startX + i * dotSpacing, dotY, dotRadius);
    }
    slotGraphics.endFill();
  }
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
  graphics.drawRect(-5, -4, 10, 12);
  graphics.endFill();

  // Head (colored based on relation)
  graphics.beginFill(color);
  graphics.lineStyle(1, 0x000000);
  graphics.drawCircle(0, -8, 5);
  graphics.endFill();

  // Add simple legs
  graphics.lineStyle(2, 0x333333);
  graphics.moveTo(-3, 8);
  graphics.lineTo(-3, 12);
  graphics.moveTo(3, 8);
  graphics.lineTo(3, 12);
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
