import GameObject from "./gameobject"
import Hex from "../../../../shared/hex"

export default class Unit extends GameObject {

  private targetHex:Hex;
  private movementStatus:number = 0;
  private visibility:number;

  constructor(owner) {
    super(owner);
  }

}
