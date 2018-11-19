
import Vector3 from "../../../shared/vector3";
import Config from "../util/config";

export default class Shell {

  public owner: string;
  public pos: Vector3;
  public velocity: Vector3;
  public size:number = Config.shell_size;
  public damage: number = Config.shell_damage;
}