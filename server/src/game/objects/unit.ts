import GameObject, { Spotter } from "./gameobject"
import Hex from "../../../../shared/hex"
import { EnumUnit } from "../../../../shared/gamedata";



export default class Unit extends GameObject implements Spotter {
  getSpottingRange(): number {
    return this.spottingDistance;
  }

  public targetHex: Hex;
  public pos: Hex;
  public speed: number;
  public movementStatus: number = 0;
  public spottingDistance: number;

  constructor(owner) {
    super(owner);
  }

  public static createUnit(owner: string, type: EnumUnit, pos: Hex): Unit {
    const unit: Unit = new Unit(owner);
    unit.pos = pos;
    switch (type) {
      case EnumUnit.SCOUT:
        unit.spottingDistance = 2;
        unit.speed = 10;
        break;
      case EnumUnit.SWORDSMAN:
        unit.spottingDistance = 1;
        unit.speed = 3;
        break;
      default:
        return null;
    }
    return unit;
  }

}
