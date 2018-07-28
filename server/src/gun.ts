import Config from "./util/config";

export default class Gun {

  readonly FIRERATE:number = Config.gun_firerate;

  public angleHorizontalActual: number = 0;
  public angleVerticalActual: number = 0;
  public angleHorizontalRequested: number = 0;
  public angleVerticalRequested: number = 0;
  public turnspeedHorizontal: number = Config.gun_turn_speed_horizontal;
  public turnspeedVertical: number = Config.gun_turn_speed_vertical;
  public velocity: number = Config.gun_velocity;
  public minAngleVertical: number = Config.gun_min_angle_vertical;
  public maxAngleVertical: number = Config.gun_max_angle_vertical;
  public minAngleHorizontal: number = Config.gun_min_angle_horizontal;
  public maxAngleHorizontal: number = Config.gun_max_angle_horizontal;
  
  public timeSinceLastShot: number = 0;

  public canShoot():boolean {
    return this.timeSinceLastShot > this.FIRERATE;
  }
}