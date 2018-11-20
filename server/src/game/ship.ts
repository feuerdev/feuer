import Gun from "./gun";
import Vector2 from "../../../shared/vector2";
import Config from "../util/config";

export default class Ship {
  public width:number = Config.ship_width;
  public height:number = Config.ship_height;
  public speed_min:number = Config.ship_speed_min;
  public speed_max:number = Config.ship_speed_max;
  public hitpoints = Config.ship_hitpoints;
  public turnSpeed: number = Config.ship_turn_speed;
  public acceleration: number = Config.ship_acceleration;

  public pos:Vector2;
  public orientation: number = 0;
  public rudderAngleActual: number = 0;
  public rudderAngleRequested: number = 0;
  public speed_actual:number = 0;
  public speed_requested: number = 0;

  public gun: Gun = new Gun();
}