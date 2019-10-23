import Hex from "../../../shared/hex";
import { Sprite } from "../../../shared/gamedata";
import Vector2 from "../../../shared/vector2";

/**
 * Tile-Class representing one hex with all its relevant fields
 * Don't put too much functionality in here. The instances of this object will get sent to the clients
 */
export default class Tile {

  private hex:Hex;
  public height:number;
  public forestation:number;
  public rockyness:number;

  public environmentSpots:Spot[] = [];

  constructor(q:number, r:number) {
    this.hex = new Hex(q, r, -q-r);
  }
}

export class Spot {
  pos:Vector2;
  type:Sprite;
  id:number; //Entity id um den spot wieder zu entfernen

  constructor(pos:Vector2, type: Sprite, id) {
    this.pos = pos;
    this.type = type;
    this.id = id;
  }
}