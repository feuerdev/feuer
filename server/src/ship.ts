import Gun from "./gun";
import Vector2 from "./util/vector2";

export default class Ship {

  public owner: string;

  constructor(owner:string) {
    this.owner = owner;
  }

  public pos:Vector2 = new Vector2();
  public orientation: number = 0;

  public rudderAngleActual: number = 0;
  public rudderAngleRequested: number = 0;
  public turnSpeed: number = 0.3;

  public speed_actual:number = 0;
  public speed_requested: number = 0;
  public acceleration: number = 0.01;

  public gun: Gun = new Gun();
}