import seedrandom from "seedrandom"
import { clamp, Hashtable, scale } from "../../shared/util.js"
import { createNoise } from "../../shared/noise.js"
import { Biome, Tile, World } from "../../shared/objects.js"
import * as Worlds from "./world.js"
import Rules from "../../shared/rules.json" with { type: "json" };
import { astar } from "../../shared/pathfinding.js"
import { getNextId } from "./main.js"
import {
  create,
  distance,
  hash,
  Hex,
  neighbors,
  neighborsRange,
} from "../../shared/hex.js"

export function generateWorld(
  seed: string,
  size: number,
  frequency: number,
  amplitude: number,
  min: number,
  max: number,
  octaves: number,
  persistence: number
): World {
  // 1. Iteration - Generate placeholder tiles in hex structure
  const tiles = firstIteration(size)
  // 2. Iteration = Generate Height and Temperature
  secondIteration()
  // 3. Iteration - Generate Rivers
  thirdIteration()
  // 4. Iteration - Precipitation
  fourthIteration()
  // 5. Iteration - Biomes
  fifthIteration()

  /**
   * Generate Height and Temperature
   */
  function secondIteration() {
    const rngHeight = seedrandom(seed)
    const heightGen = createNoise({
      random: rngHeight,
      frequency: Number(frequency),
      amplitude: Number(amplitude),
      min: Number(min),
      max: Number(max),
      octaves: Number(octaves),
      persistence: Number(persistence),
    })

    Object.values(tiles).forEach((tile) => {
      let heightValue = heightGen.scaled2D(tile.hex.q, tile.hex.r)

      //Temperature
      let latitudeFactor = scale(
        gauss(scale(tile.hex.r, -size, size, -2, 2)),
        0,
        0.4,
        -12,
        28
      )
      let heightFactor = heightValue > 0.29 ? 10 * heightValue : 0
      let temperature = latitudeFactor - heightFactor

      tile.height = heightValue
      tile.temperature = temperature

      // Assign Ocean Biomes
      if (tile.height < Rules.settings.map_height_ocean) {
        tile.biome = Biome.Ocean
        return
      }

      if (tile.height < Rules.settings.map_height_shore) {
        tile.biome = Biome.Shore
        return
      }
    })
  }

  /**
   * Generate Rivers and Preciptation
   */
  function thirdIteration() {
    const riverRng = seedrandom(seed + 1)
    Object.values(tiles).forEach((tile) => {
      if (
        !(
          tile.height > Rules.settings.map_height_river_min &&
          tile.height < Rules.settings.map_height_river_max
        )
      ) {
        // Not High/Low enough to be a river
        return
      }

      if (tile.temperature < Rules.settings.map_temperature_ice) {
        // No rivers in ice
        return
      }

      if (riverRng() > Rules.settings.map_river_frequency) {
        // Random chance generate a river
        return
      }

      tile.biome = Biome.River

      while (true) {
        let neighbours = neighbors(tile.hex)

        //find the neighbour with the lowest height
        let lowestNeighbour: Tile | undefined = undefined
        let lowestHeight = tile.height
        neighbours.forEach((neighbour) => {
          let neighbourTile = tiles[hash(neighbour)]
          if (neighbourTile && neighbourTile.height < lowestHeight) {
            lowestNeighbour = neighbourTile
            lowestHeight = neighbourTile.height
          }
        })

        if (!lowestNeighbour || lowestNeighbour.height >= tile.height) {
          // Lowest point found
          // Look if a body of water is close (less than 5 tiles), if yes, connect
          // If no, create small lake
          let distance = 2
          let target: Hex | undefined = undefined
          while (true) {
            neighborsRange(tile.hex, distance).forEach((neighbour) => {
              let neighbourTile = tiles[hash(neighbour)]
              if (
                neighbourTile &&
                neighbourTile.height < Rules.settings.map_height_shore
              ) {
                target = neighbour
                return
              }
            })
            if (target || distance > 5) {
              break
            }
            distance++
          }

          if (target) {
            // Connect to body of water
            let path = astar(tiles, tile.hex, target, false)
            path.forEach((hex) => {
              tiles[hash(hex)].biome = Biome.River
            })
          } else {
            // Create small lake
            neighbors(tile.hex).forEach((neighbour) => {
              let neighbourTile = tiles[hash(neighbour)]
              if (neighbourTile && riverRng() > 0.5) {
                neighbourTile.biome = Biome.River
              }
            })
          }
          break
        }

        if (
          lowestNeighbour.height < Rules.settings.map_height_shore ||
          lowestNeighbour.biome === Biome.River
        ) {
          // Body of water found, stop
          break
        }

        lowestNeighbour.biome = Biome.River
        tile = lowestNeighbour
      }
    })
  }

  /**
   * Calculate Precipitation
   */
  function fourthIteration() {
    let desertFactor = (y: number) => {
      if (Math.abs(y) > 0.5) {
        return 0
      }
      return Math.pow(Math.sin(y * Math.PI * 2) * 0.7, 4)
    }
    const rngPrecipitation = seedrandom(seed + 2)
    const precipGen = createNoise({
      random: rngPrecipitation,
      frequency: 0.15,
      amplitude: 1,
      min: 0.2,
      max: 0.7,
      octaves: 4,
      persistence: 0.5,
    })

    // Calculate Precipitation
    Object.values(tiles).forEach((tile) => {
      tile.precipitation = precipGen.scaled2D(tile.hex.q, tile.hex.r)

      if (
        tile.biome === Biome.River ||
        tile.height < Rules.settings.map_height_shore
      ) {
        tile.precipitation = 1
        return
      }

      let region = neighborsRange(tile.hex, 10)
      for (let hex of region) {
        let neighbour = tiles[hash(hex)]
        if (
          neighbour &&
          (neighbour.biome === Biome.River ||
            neighbour.height < Rules.settings.map_height_shore)
        ) {
          let dist = distance(tile.hex, neighbour.hex)
          tile.precipitation += 0.02 / (dist * 2)
        }
      }

      // Lower precipitation if latitude is at around 30°
      let latitude = Math.abs(tile.hex.r) / (size / 2)

      // Desert Belt, remove some precipitation
      tile.precipitation -= desertFactor(latitude)

      tile.precipitation = clamp(tile.precipitation, 0, 1)
    })
  }

  /**
   * Assign Biomes
   */
  function fifthIteration() {
    Object.values(tiles).forEach((tile) => {
      if (tile.biome !== Biome.None) {
        // Biome is already set (e.g. river)
        return
      }

      //Ice
      if (tile.temperature < Rules.settings.map_temperature_ice) {
        tile.biome = Biome.Ice
        return
      }

      //Beaches
      if (tile.temperature > 8) {
        let adjacentShores = neighbors(tile.hex).filter((hex) => {
          let neighbour = tiles[hash(hex)]
          return neighbour && neighbour.biome === Biome.Shore
        }).length
        if (adjacentShores >= 2) {
          tile.biome = Biome.Beach
          return
        }
      }

      //Peaks
      if (
        tile.height > Rules.settings.map_height_peaks &&
        tile.temperature < 10
      ) {
        tile.biome = Biome.Peaks
        return
      }

      //Mountains
      if (tile.height > Rules.settings.map_height_mountain) {
        tile.biome = Biome.Mountain
        return
      }

      //Treeline
      if (tile.height > Rules.settings.map_height_treeline) {
        tile.biome = Biome.Treeline
        return
      }

      //Desert
      if (
        tile.temperature > Rules.settings.map_temperature_desert &&
        tile.precipitation < Rules.settings.map_precipitation_desert
      ) {
        tile.biome = Biome.Desert
        return
      }

      //Tropical Forest
      if (
        tile.temperature > Rules.settings.map_temperature_tropical &&
        tile.precipitation > Rules.settings.map_precipitation_tropical
      ) {
        tile.biome = Biome.Tropical
        return
      }

      //Tundra
      if (
        tile.temperature < Rules.settings.map_temperature_tundra &&
        tile.precipitation < Rules.settings.map_precipitation_tundra
      ) {
        tile.biome = Biome.Tundra
        return
      }

      //Boreal Forest
      if (
        tile.temperature < Rules.settings.map_temperature_boreal &&
        tile.precipitation > Rules.settings.map_precipitation_forest
      ) {
        tile.biome = Biome.Boreal
        return
      }

      //Temperate Forest
      if (tile.precipitation > Rules.settings.map_precipitation_forest) {
        tile.biome = Biome.Temperate
        return
      }

      //Grassland (Fallback)
      tile.biome = Biome.Grassland
    })
  }

  const world = Worlds.create(tiles)
  return world
}

function gauss(x: number) {
  return Math.pow(Math.E, -Math.pow(x, 2) / 2) / Math.sqrt(2 * Math.PI)
}

/**
 * Generate "empty" tiles in a hex grid with given size
 * @param size Size of the hex structure (distance from center to each edge)
 * @returns Stubs for all tiles
 */
function firstIteration(size: number): Hashtable<Tile> {
  let result: Hashtable<Tile> = {}
  for (let q: number = -size; q <= size; q++) {
    let r1: number = Math.max(-size, -q - size)
    let r2: number = Math.min(size, -q + size)
    for (let r: number = r1; r <= r2; r++) {
      let hex = create(q, r)
      let tile: Tile = {
        precipitation: 0,
        biome: Biome.None,
        hex: hex,
        height: 0,
        resources: {},
        temperature: 0,
        id: getNextId(),
      }
      result[hash(hex)] = tile
    }
  }
  return result
}
