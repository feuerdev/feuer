
import * as seedrandom from "seedrandom";
import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import FastSimplexNoise from "../../../shared/noise";
import config from "../util/config";

export default class Mapgen {  

  static create(seed, map_size, frequency, amplitude, min, max, octaves, persistence) {
    const rng = seedrandom(seed);
    const noiseGen = new FastSimplexNoise({
        random: rng,
        frequency: Number(frequency),
        amplitude: Number(amplitude),
        min: Number(min),
        max: Number(max),
        octaves: Number(octaves),
        persistence: Number(persistence)
    });

    let tiles:Hashtable<Tile> = {};

    let size=Number(map_size);

    let hmax = 0;
    let hmin = 0;
    for(let q:number = -size; q <= size; q++) {
      let r1:number = Math.max(-size, -q - size);
      let r2:number = Math.min(size, -q + size);
      for (let r:number = r1; r <= r2; r++) {
          let tile = new Tile(q,r);
          let heightValue = noiseGen.scaled2D(q, r);
          if(heightValue > hmax) {
            hmax = heightValue;
          }
          if(heightValue < hmin) {
            hmin = heightValue;
          }
          tile.height = heightValue; 
          tiles[q+"-"+r] = tile;
      }
    }
    console.log("Max: " + hmax);
    console.log("Min: " + hmin);
    return tiles;
  }
}

