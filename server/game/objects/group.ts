import GameObject, { Spotter, Drawable } from "./gameobject"
import Hex from "../../../shared/hex"
import * as Rules from "../../../shared/rules.json"
import Resources from "./resources"
import Unit from "./unit"

export default class Group extends GameObject implements Spotter, Drawable {
  /**
   * Spottable
   */
  getSpottingRange(): number {
    return this.spottingDistance
  }

  /**
   * Drawable
   */
  getTexture(): string {
    return this.texture
  }

  /**
   * Position
   */
  public targetHexes: Hex[] = []
  public pos: Hex

  /**
   * Gameplay
   */
  public speed: number
  public attack: number
  public hp: number
  public spottingDistance: number
  public movementStatus: number = 0

  public units: Unit[] = []

  public resources = new Resources()

  /**
   * Graphics
   */
  private texture: string

  constructor(owner) {
    super(owner)
  }

  public static createGroup(owner: string, name: string, pos: Hex): Group {
    const template = Rules.units[name]
    const group: Group = new Group(owner)
    group.pos = pos
    group.spottingDistance = template.spottingDistance
    group.texture = template.texture
    group.speed = template.speed
    group.attack = template.attack
    group.hp = template.hp
    group.units.push(Unit.generateUnit(owner))
    return group
  }
}
