import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import Unit from "./objects/unit";

export default class World {

  private tiles:Hashtable<Tile>;
  public units:Unit[];

  constructor(tiles, units) {
    this.tiles = tiles;
    this.units = units;
  }

}