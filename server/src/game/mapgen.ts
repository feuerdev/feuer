
import * as seedrandom from "seedrandom";
import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import FastSimplexNoise from "../../../shared/noise";
import config from "../util/config";
import * as GameData from "../../../shared/gamedata";
import Log from "../util/log";

export default class Mapgen {

  static create(seed, map_size, frequency, amplitude, min, max, octaves, persistence) {
    const rngHeight = seedrandom(seed);
    const heightGen = new FastSimplexNoise({
      random: rngHeight,
      frequency: Number(frequency),
      amplitude: Number(amplitude),
      min: Number(min),
      max: Number(max),
      octaves: Number(octaves),
      persistence: Number(persistence)
    });

    const rngTree = seedrandom(seed + 1);
    const treeGen = new FastSimplexNoise({
      random: rngTree,
      frequency: Number(frequency),
      amplitude: Number(amplitude),
      min: Number(min),
      max: Number(max),
      octaves: Number(octaves),
      persistence: Number(persistence)
    });

    const rngStone = seedrandom(seed + 2);
    const stoneGen = new FastSimplexNoise({
      random: rngStone,
      frequency: Number(frequency),
      amplitude: Number(amplitude),
      min: Number(min),
      max: Number(max),
      octaves: Number(octaves),
      persistence: Number(persistence)
    });


    let tiles: Hashtable<Tile> = {};

    let size = Number(map_size);

    for(let q: number = -size; q <= size; q++) {
      let r1: number = Math.max(-size, -q - size);
      let r2: number = Math.min(size, -q + size);
      for(let r: number = r1; r <= r2; r++) {
        let tile = new Tile(q, r);
        let heightValue = heightGen.scaled2D(q, r);
        let treeValue = treeGen.scaled2D(q, r);
        let stoneValue = stoneGen.scaled2D(q, r);

        //No rocks and trees in water obviously
        if (heightValue <= GameData.level_sand_grassy) {
          treeValue = 0;
          stoneValue = 0;
        }

        //Reduce trees above timberline and increase rockiness
        if (heightValue >= GameData.level_stone) {
          treeValue /= 2;
          stoneValue = Math.min(stoneValue * 1.5, 1);
        }

        let envSpots = [];
        if(stoneValue > 0.5) {
          envSpots[0] = GameData.Environment.envStone;
        }
        
        if(treeValue > 0.3) {
          if(treeValue < 0.5) {
            envSpots[1] = GameData.Environment.envTreesFew;
          } else if(heightValue <= GameData.level_grass_dirty) {
            envSpots[1] = GameData.Environment.envTreesMixed;
          } else if(heightValue <= GameData.level_stone_dirty) {          
            envSpots[1] = GameData.Environment.envTreesFirs;
          } else {
            envSpots[1] = GameData.Environment.envTreesFirs2;
          }
        }


        envSpots[0] = stoneValue > 0.5 ? GameData.Environment.envStone : null;
        envSpots[1] = treeValue > 0.7 ? GameData.Environment.envTreesMixed : GameData.Environment.envTreesFew;
        envSpots[2] = null;

        //Set the environment spots at different places each tile to make it look mor random
        let index = Math.round(Math.random() * 2);
        let index2 = (index + 1) % 3;
        let index3 = (index + 2) % 3;

        tile.environmentSpot1 = envSpots[index]
        tile.environmentSpot2 = envSpots[index2]
        tile.environmentSpot3 = envSpots[index3]
        tile.forestation = treeValue;
        tile.rockyness = stoneValue;
        tile.height = heightValue;
        tiles[q + "-" + r] = tile;
      }
    }
    Log.info("Map created");
    return tiles;
  }
}

