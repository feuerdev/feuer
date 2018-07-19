import Vector3 from "./util/vector3";
import Gun from "./gun";

export default class Ship {

  public pos:Vector3;
  public angleHorizontal: number;

  public speed_actual:number;
  public speed_requested: number;

  public gun: Gun = new Gun();
}