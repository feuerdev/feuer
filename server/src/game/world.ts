import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import Army from "./objects/army";
import Building from "./objects/building";
import PlayerRelation from "../../../shared/relation";
import Battle from "./objects/battle";

export default class World {

  public tiles:Hashtable<Tile>;
  public armies:Army[];
  public buildings:Building[];
  public playerRelations:Hashtable<PlayerRelation>;
  public battles:Battle[];

  constructor(tiles, armies, buildings, playerRelations, battles) {
    this.tiles = tiles;
    this.armies = armies;
    this.buildings = buildings;
    this.playerRelations = playerRelations;
    this.battles = battles;
  }

}