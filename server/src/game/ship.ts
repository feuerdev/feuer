import Gun from "./gun";
import Vector2 from "../../../shared/vector2";
import Config from "../util/config";

export default class Ship {

  public owner: string;
  public username: string; //TODO: this is weird. Make it pretty

  constructor(owner:string) {
    this.owner = owner;
  }

  public teamId:number;

  public width:number = Config.ship_width;
  public height:number = Config.ship_height;

  public speed_min:number = Config.ship_speed_min;
  public speed_max:number = Config.ship_speed_max;

  public pos:Vector2;
  public orientation: number = 0;

  public hitpoints = Config.ship_hitpoints;

  public rudderAngleActual: number = 0;
  public rudderAngleRequested: number = 0;
  public turnSpeed: number = Config.ship_turn_speed;

  public speed_actual:number = 0;
  public speed_requested: number = 0;
  public acceleration: number = Config.ship_acceleration;

  public gun: Gun = new Gun();
}