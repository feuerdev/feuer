import GameObject from "./gameobject"
import Hex from "../../../../shared/hex"

export enum EnumUnit {
  SCOUT = 0,
  SWORDSMAN,
}

export default class Unit extends GameObject {

  public targetHex: Hex;
  public pos: Hex;
  public speed: number;
  public movementStatus: number = 0;
  public visibility: number;

  constructor(owner) {
    super(owner);
  }

  public static createUnit(owner: string, type: EnumUnit, pos: Hex): Unit {
    const unit: Unit = new Unit(owner);
    unit.pos = pos;
    switch (type) {
      case EnumUnit.SCOUT:
        unit.visibility = 2;
        unit.speed = 10;
        break;
      case EnumUnit.SWORDSMAN:
        unit.visibility = 1;
        unit.speed = 3;
        break;
      default:
        return null;
    }
    return unit;
  }

}
