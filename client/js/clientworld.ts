import { Hashtable } from "../../shared/util";
import { PlayerRelation } from "../../shared/gamedata";

export default class ClientWorld {
  public tiles: any = {};
  public units: any[] = [];
  public playerRelations:Hashtable<PlayerRelation> = {};
}