import GameObject, { Spotter, Drawable } from "./gameobject"
import Hex from "../../../../shared/hex"
import { EnumUnit, Sprite } from "../../../../shared/gamedata";



export default class Unit extends GameObject implements Spotter, Drawable {
  getSpottingRange(): number {
    return this.spottingDistance;
  }

  getSprite():Sprite {
    return this.sprite;
  }

  public targetHexes: Hex[] = [];
  public pos: Hex;
  public speed: number;
  public movementStatus: number = 0;
  public spottingDistance: number;
  private sprite:Sprite;

  constructor(owner) {
    super(owner);
  }

  public static createUnit(owner: string, type: EnumUnit, pos: Hex): Unit {
    const unit: Unit = new Unit(owner);
    unit.pos = pos;
    switch (type) {
      case EnumUnit.SCOUT:
        unit.spottingDistance = 1;
        unit.speed = 10;
        unit.sprite = Sprite.unitScout;
        break;
      case EnumUnit.SWORDSMAN:
        unit.spottingDistance = 0;
        unit.speed = 3;
        //unit.sprite = Sprite.unitSwordsman;
        break;
      default:
        return null;
    }
    return unit;
  }

}
