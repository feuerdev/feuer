
import Vector3 from "../../../shared/vector3";
import Config from "../util/config";
import Player from "./player";

export default class Shell {

  constructor(owner: Player) {
    this.owner = owner;
  }

  public owner: Player;
  public pos: Vector3;
  public velocity: Vector3;
  public size: number = Config.shell_size;
  public damage: number = Config.shell_damage;
}