import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import Unit from "./objects/unit";
import Building from "./objects/building";

export default class World {

  private tiles:Hashtable<Tile>;
  public units:Unit[];
  public buildings:Building[];

  constructor(tiles, units, buildings) {
    this.tiles = tiles;
    this.units = units;
    this.buildings = buildings;
  }

}