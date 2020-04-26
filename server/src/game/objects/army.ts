import GameObject, { Spotter, Drawable } from "./gameobject"
import Hex from "../../../../shared/hex"
import { EnumUnit, Sprite } from "../../../../shared/gamedata";

export default class Army extends GameObject implements Spotter, Drawable {
  /**
   * Spottable
   */
  getSpottingRange(): number {
    return this.spottingDistance;
  }

  /**
   * Drawable
   */
  getSprite():Sprite {
    return this.sprite;
  }

  /**
   * Position
   */
  public targetHexes: Hex[] = [];
  public pos: Hex;

  /**
   * Gameplay
   */
  public speed: number;
  public attack: number = 5;
  public health: number = 100;
  public movementStatus: number = 0;
  public spottingDistance: number;
  public food:number = 0;
  public wood:number = 0;
  public stone:number = 0;
  public iron:number = 0;
  public gold:number = 0;

  /**
   * Graphics
   */
  private sprite:Sprite;

  constructor(owner) {
    super(owner);
  }

  public static createUnit(owner: string, type: EnumUnit, pos: Hex): Army {
    const unit: Army = new Army(owner);
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
