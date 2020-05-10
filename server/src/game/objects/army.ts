import GameObject, { Spotter, Drawable } from "./gameobject"
import Hex from "../../../../shared/hex"
import * as Rules from "../../../../shared/rules.json";

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
  getTexture():string {
    return this.texture;
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
  public attack: number;
  public hp: number;
  public spottingDistance: number;
  public movementStatus: number = 0;

  public resources = {};

  /**
   * Graphics
   */
  private texture:string;

  constructor(owner) {
    super(owner);
  }

  public static createUnit(owner: string, name: string, pos: Hex): Army {
    const template = Rules.units[name];
    const army: Army = new Army(owner);
    army.pos = pos;
    army.spottingDistance = template.spottingDistance;
    army.texture = template.texture;
    army.speed = template.speed;
    army.attack = template.attack;
    army.hp = template.hp;
    return army;
  }
}
