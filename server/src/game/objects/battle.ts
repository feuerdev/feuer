import GameObject from "./gameobject";
import Group from "./group";
import Hex from "../../../../shared/hex";

export default class Battle extends GameObject {

  public aAttacker: Group;
  public aDefender: Group;
  public pos:Hex;

  constructor(pos, aAttacker, aDefender) {
    super(null);
    this.pos = pos;
    this.aAttacker = aAttacker;
    this.aDefender = aDefender;
  }
}