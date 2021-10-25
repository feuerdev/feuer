import GameObject from "./gameobject"

export default class Unit extends GameObject {
  //Character Traits (Can only slightly be altered):
  //Leadership:
  private leadership: number
  private courage: number
  private tactics: number
  private teacher: number

  //Personal:
  private agressiveness: number

  //Physical:
  private height: number
  private weight: number

  //Character Skills (Can be trained):
  //Combat:
  private sword: number
  private spear: number
  private bow: number
  private dodging: number

  //Physical:
  private strength: number
  private endurance: number

  //Experience:
  private experience_theory: number
  private experience_combat: number

  private name: string = "Peter" //Randomly Generate name

  constructor(owner: string) {
    super(owner)
  }

  static generateUnit(owner: string): Unit {
    let unit = new Unit(owner)
    //TODO: Randomly generate stats here
    return unit
  }
}
