import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import Army from "./objects/army";
import Building from "./objects/building";
import { PlayerRelation } from "../../../shared/gamedata";

export default class World {

  public tiles:Hashtable<Tile>;
  public units:Army[];
  public buildings:Building[];
  public playerRelations:Hashtable<PlayerRelation>;

  constructor(tiles, units, buildings, playerRelations) {
    this.tiles = tiles;
    this.units = units;
    this.buildings = buildings;
    this.playerRelations = playerRelations;
  }

}