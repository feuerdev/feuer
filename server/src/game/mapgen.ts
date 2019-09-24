
import * as seedrandom from "seedrandom";
import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import FastSimplexNoise from "../../../shared/noise";

export default class Mapgen {  

  static create(seed, size, frequency, amplitude, min, max, octaves, persistence) {
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

    for(let q:number = -size; q <= size; q++) {
      let r1:number = Math.max(-size, -q - size);
      let r2:number = Math.min(size, -q + size);
      for (let r:number = r1; r <= r2; r++) {
          tiles[q+"-"+r] = new Tile(q,r);
      }
    }

    let tmax = 0;
    let tmin = 0;
    for (var x = 0; x < size; x++) {
        for (var y = 0; y < size; y++) {
            let tile = tiles[x+"-"+y];
            if(tile) {
              let heightValue = noiseGen.scaled2D(x, y);
              if(heightValue > tmax) {
                tmax = heightValue;
              }
              if(heightValue < tmin) {
                tmin = heightValue;
              }
              tiles[x+"-"+y].height = heightValue;
            }
        }
    }

    console.log("Max: " + tmax);
    console.log("Min: " + tmin);
    return tiles;
  }
}

