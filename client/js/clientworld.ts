import { Hashtable } from "../../shared/util";
import PlayerRelation from "../../shared/relation";
import Hex from "../../shared/hex";

export default class ClientWorld {
  public tiles: any = {};
  public groups: any[] = [];
  public battles: any[] = [];
  public buildings: any[] = [];
  public playerRelations:Hashtable<PlayerRelation> = {};

  getGroup(id:number):any|undefined {
    return this.groups.find(group => { return group.id === id});
  }

  getTile(hex:Hex):any|undefined {
    return this.tiles[hex.hash()];
  }

  getTileWithHash(hash:string):any|undefined {
    return this.tiles[hash];
  }

  getBattleById(id:number):any|undefined {
    return this.battles.find(battle => { return battle.id === id});
  }

  getBuilding(id:number):any|undefined {
    return this.buildings.find(building => { return building.id === id});
  } 
}