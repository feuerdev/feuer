import { Hashtable } from "../../../shared/util";
import Tile from "./tile";

export default class World {

  private tiles:Hashtable<Tile>;

  constructor(tiles) {
    this.tiles = tiles;
  }

}