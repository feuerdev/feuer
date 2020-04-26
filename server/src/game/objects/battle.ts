import GameObject from "./gameobject";
import Army from "./army";

export default class Battle extends GameObject {

  public aAttacker: Army;
  public aDefender: Army;

  constructor(aAttacker, aDefender) {
    super(null);
    this.aAttacker = aAttacker;
    this.aDefender = aDefender;
  }
}