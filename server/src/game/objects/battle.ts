import GameObject from "./gameobject";
import Army from "./army";
import Hex from "../../../../shared/hex";

export default class Battle extends GameObject {

  public aAttacker: Army;
  public aDefender: Army;
  public pos:Hex;

  constructor(pos, aAttacker, aDefender) {
    super(null);
    this.pos = pos;
    this.aAttacker = aAttacker;
    this.aDefender = aDefender;
  }
}