import seedrandom from "seedrandom"
import { clamp, Hashtable, scale } from "../../shared/util"
import FastSimplexNoise from "../../shared/noise"
import Log from "../util/log"
import Vector2 from "../../shared/vector2"
import { Tile, World } from "../../shared/objects"
import * as Worlds from "./world"
import Hex, * as Hexes from "../../shared/hex"
import * as Rules from "../../shared/rules.json"
import * as Resources from "../../shared/resources"
import GameServer from "./gameserver"
import { astar } from "../../shared/pathfinding"

export default class Mapgen {
  public static create(
    seed: string,
    map_size: number,
    frequency: number,
    amplitude: number,
    min: number,
    max: number,
    octaves: number,
    persistence: number
  ): World {
    const rngHeight = seedrandom(seed)
    const heightGen = new FastSimplexNoise({
      random: rngHeight,
      frequency: Number(frequency),
      amplitude: Number(amplitude),
      min: Number(min),
      max: Number(max),
      octaves: Number(octaves),
      persistence: Number(persistence),
    })

    // const rngTree = seedrandom(seed + 1)
    // const treeGen = new FastSimplexNoise({
    //   random: rngTree,
    //   frequency: Number(frequency),
    //   amplitude: Number(amplitude),
    //   min: Number(min),
    //   max: Number(max),
    //   octaves: Number(octaves),
    //   persistence: Number(persistence),
    // })

    // const rngStone = seedrandom(seed + 2)
    // const stoneGen = new FastSimplexNoise({
    //   random: rngStone,
    //   frequency: Number(frequency),
    //   amplitude: Number(amplitude),
    //   min: Number(min),
    //   max: Number(max),
    //   octaves: Number(octaves),
    //   persistence: Number(persistence),
    // })

    // const rngIron = seedrandom(seed + 3)
    // const ironGen = new FastSimplexNoise({
    //   random: rngIron,
    //   frequency: Number(frequency),
    //   amplitude: Number(amplitude),
    //   min: Number(min),
    //   max: Number(max),
    //   octaves: Number(octaves),
    //   persistence: Number(persistence),
    // })

    // const rngGold = seedrandom(seed + 4)
    // const goldGen = new FastSimplexNoise({
    //   random: rngGold,
    //   frequency: Number(frequency),
    //   amplitude: Number(amplitude),
    //   min: Number(min),
    //   max: Number(max),
    //   octaves: Number(octaves),
    //   persistence: Number(persistence),
    // })

    let tiles: Hashtable<Tile> = {}

    let size = Number(map_size)

    for (let q: number = -size; q <= size; q++) {
      let r1: number = Math.max(-size, -q - size)
      let r2: number = Math.min(size, -q + size)
      for (let r: number = r1; r <= r2; r++) {
        let heightValue = heightGen.scaled2D(q, r)

        //Temperature
        let latitudeFactor = scale(
          this.gauss(scale(r, -size, size, -2, 2)),
          0,
          0.4,
          -12,
          28
        )
        let heightFactor = heightValue > 0.29 ? 10 * heightValue : 0
        let temperature = latitudeFactor - heightFactor

        let hex = Hexes.create(q, r)
        let tile: Tile = {
          id: GameServer.idCounter++,
          precipitation: 0,
          hex: hex,
          river: false,
          height: heightValue,
          temperature: temperature,
          // forestation: treeValue,
          // rockyness: stoneValue,
          // ironOre: ironValue,
          // goldOre: goldValue,
          resources: Resources.create(),
        }
        tiles[Hexes.hash(hex)] = tile

        //No rocks and trees in water obviously
        // if (heightValue <= Rules.settings.map_level_water_shallow) {
        //   tile.treeValue = 0
        //   stoneValue = 0
        //   ironValue = 0
        //   goldValue = 0
        // }

        // //Less trees (cactii) but more stone in sand
        // if (heightValue <= Rules.settings.map_level_sand_grassy) {
        //   treeValue /= 2
        //   stoneValue = Math.min(stoneValue * 1.3, 1)
        //   ironValue = 0
        //   goldValue = 0
        // }

        // //Reduce trees above timberline and increase rockiness
        // if (heightValue >= Rules.settings.map_level_stone) {
        //   treeValue /= 2
        //   stoneValue = Math.min(stoneValue * 1.2, 1)
        //   ironValue = Math.min(ironValue * 1.4, 1)
        //   goldValue = Math.min(goldValue * 1.5, 1)
        // }

        //TODO: clientside
        // while (treeValue > 0) {
        //   let pos: Vector2 = Mapgen.generatePos()
        //   treeValue -= 0.05
        //   tile.environmentSpots.push(
        //     new Spot(pos, Mapgen.generateTree(heightValue), -1)
        //   )
        // }

        // while (stoneValue > 0) {
        //   let pos: Vector2 = Mapgen.generatePos()
        //   stoneValue -= 0.15
        //   tile.environmentSpots.push(new Spot(pos, Mapgen.generateStone(), -1))
        // }
        // while (ironValue > 0.7) {
        //   let pos: Vector2 = Mapgen.generatePos()
        //   ironValue -= 0.1
        //   tile.environmentSpots.push(new Spot(pos, "iron", -1))
        // }
        // while (goldValue > 0.7) {
        //   let pos: Vector2 = Mapgen.generatePos()
        //   goldValue -= 0.1
        //   tile.environmentSpots.push(new Spot(pos, "gold", -1))
        // }

        // //Sort environment spots by y-Value
        // tile.environmentSpots.sort(function (a, b) {
        //   return a.pos.y - b.pos.y
        // })
      }
    }

    // Generate rivers
    const riverRng = seedrandom(seed + 1)
    Object.values(tiles).forEach((tile) => {
      if (
        !(
          tile.height > Rules.settings.map_level_dirt &&
          tile.height < Rules.settings.map_level_dirt_stony
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

      tile.river = true

      while (true) {
        let neighbours = Hexes.neighbors(tile.hex)

        //find the neighbour with the lowest height
        let lowestNeighbour: Tile | undefined = undefined
        let lowestHeight = tile.height
        neighbours.forEach((neighbour) => {
          let neighbourTile = tiles[Hexes.hash(neighbour)]
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
          let target: Hex
          while (true) {
            Hexes.neighborsRange(tile.hex, distance).forEach((neighbour) => {
              let neighbourTile = tiles[Hexes.hash(neighbour)]
              if (
                neighbourTile &&
                neighbourTile.height < Rules.settings.map_level_water_shallow
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
            let path = astar(tiles, tile.hex, target)
            path.forEach((hex) => {
              tiles[Hexes.hash(hex)].river = true
            })
          } else {
            // Create small lake
            Hexes.neighbors(tile.hex).forEach((neighbour) => {
              let neighbourTile = tiles[Hexes.hash(neighbour)]
              if (neighbourTile && riverRng() > 0.5) {
                neighbourTile.river = true
              }
            })
          }
          break
        }

        if (
          lowestNeighbour.height < Rules.settings.map_level_water_shallow ||
          lowestNeighbour.river
        ) {
          // Body of water found, stop
          break
        }

        lowestNeighbour.river = true
        tile = lowestNeighbour
      }

      // Calculate Precipitation
      Object.values(tiles).forEach((tile) => {
        tile.precipitation = 0.5

        if (
          tile.river ||
          tile.height < Rules.settings.map_level_water_shallow
        ) {
          tile.precipitation = 1
          return
        }

        let region = Hexes.neighborsRange(tile.hex, 4)
        for (let hex of region) {
          let neighbour = tiles[Hexes.hash(hex)]
          if (
            neighbour &&
            (neighbour.river ||
              neighbour.height < Rules.settings.map_level_water_shallow)
          ) {
            tile.precipitation += 0.2
          }
        }

        // Lower precipitation if latitude is at around 30°
        let latitude = Math.abs(tile.hex.r) / (size / 2)

        // sin^2(x*4) Peaks at around -0.3 and 0.3
        let f = (x: number) => {
          if (Math.abs(x) > 0.6) {
            return 0
          }
          return Math.pow(Math.sin(x * 5) * 0.5, 2)
        }

        // Desert Belt, remove some precipitation
        tile.precipitation -= f(latitude) //desertGen.scaled2D(tile.hex.r, tile.hex.q) * 30

        tile.precipitation = clamp(tile.precipitation, 0, 1)
      })
    })

    Log.info("Map created")

    const world = Worlds.create(tiles)
    return world
  }

  static gauss(x: number) {
    return Math.pow(Math.E, -Math.pow(x, 2) / 2) / Math.sqrt(2 * Math.PI)
  }

  static generatePos(): Vector2 {
    let result: Vector2
    while (!result) {
      let x = Math.random() * 130 - 85
      let y = Math.random() * 90 - 70
      result = { x: x, y: y }
    }
    return result
  }

  static generateTree(height): string {
    if (height <= Rules.settings.map_level_sand_grassy) {
      let rand = Math.round(Math.random())
      switch (rand) {
        case 0:
          return "cactus1"
        case 1:
          return "cactus2"
      }
    } else if (height <= Rules.settings.map_level_grass_dirty) {
      let rand = Math.round(Math.random() * 2)
      switch (rand) {
        case 0:
          return "treeSmall"
        case 1:
          return "treeBig"
        case 2:
          return "treeFullFirSmall"
      }
    } else if (height <= Rules.settings.map_level_stone) {
      let rand = Math.round(Math.random() * 3)
      switch (rand) {
        case 0:
          return "treeFirBig"
        case 1:
          return "treeFirSmall"
        case 2:
          return "treeFullFirSmall"
        case 3:
          return "treeFullFirBig"
      }
    } else if (height <= Rules.settings.map_level_ice) {
      return "treeFirSnow"
    }
    return null
  }

  static generateStone(): string {
    let rand = Math.round(Math.random() * 3)
    switch (rand) {
      case 0:
        return "rock01"
      case 1:
        return "rock02"
      case 2:
        return "rock04"
      case 3:
        return "rock05"
    }
    return null
  }
}
