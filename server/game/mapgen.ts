import seedrandom from "seedrandom"
import { Hashtable, scale } from "../../shared/util"
import FastSimplexNoise from "../../shared/noise"
import Log from "../util/log"
import Vector2 from "../../shared/vector2"
import { Tile, World } from "../../shared/objects"
import * as Worlds from "./world"
import * as Hex from "../../shared/hex"
import * as Rules from "../../shared/rules.json"
import * as Resources from "../../shared/resources"
import GameServer from "./gameserver"

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

        let hex = Hex.create(q, r)
        let tile: Tile = {
          id: GameServer.idCounter++,
          hex: hex,
          height: heightValue,
          temperature: temperature,
          // forestation: treeValue,
          // rockyness: stoneValue,
          // ironOre: ironValue,
          // goldOre: goldValue,
          resources: Resources.create(),
        }
        tiles[Hex.hash(hex)] = tile

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
