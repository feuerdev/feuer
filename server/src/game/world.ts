import { Hashtable } from "../../../shared/util"
import Tile from "./tile"
import Group from "./objects/group"
import Building from "./objects/building"
import PlayerRelation from "../../../shared/relation"
import Battle from "./objects/battle"

export default class World {
  public tiles: Hashtable<Tile>
  public groups: Group[]
  public buildings: Building[]
  public playerRelations: Hashtable<PlayerRelation>
  public battles: Battle[]

  constructor(tiles, groups, buildings, playerRelations, battles) {
    this.tiles = tiles
    this.groups = groups
    this.buildings = buildings
    this.playerRelations = playerRelations
    this.battles = battles
  }
}
