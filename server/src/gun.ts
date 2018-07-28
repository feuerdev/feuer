import Config from "./util/config";

export default class Gun {

  readonly FIRERATE:number = Config.gun_firerate;

  public angleHorizontalActual: number = 0;
  public angleVerticalActual: number = 0;
  public angleHorizontalRequested: number = 0;
  public angleVerticalRequested: number = 0;
  public turnspeed: number = Config.gun_turn_speed;
  public velocity: number = Config.gun_velocity;
  public minAngleVertical: number = 3;
  public maxAngleVertical: number = 80;
  public minAngleHorizontal: number = -115;
  public maxAngleHorizontal: number = 115;
  
  public timeSinceLastShot: number = 0;

  public canShoot():boolean {
    return this.timeSinceLastShot > this.FIRERATE;
  }
}