import { Socket } from "../../node_modules/@types/socket.io";
import Ship from "./ship";
import Shell from "./shell";
import Vector3 from "./util/vector3";

export interface PlayerDelegate {
  onPlayerDisconnected(player: Player);
  onPlayerShot(player: Player, shell: Shell);
}

export default class Player {
  public socket: Socket;
  public delegate: PlayerDelegate;

  public ship: Ship = new Ship();

  constructor(socket: Socket) {
    this.socket = socket;
    socket.on("disconnect", () => this.delegate.onPlayerDisconnected);
    socket.on("input speed", () => this.onShipSpeed);
    socket.on("input gun horizontal", () => this.onGunAngleHorizontal);
    socket.on("input gun vertical", () => this.onGunAngleVertical);
    socket.on("input rudder ", () => this.onRudderPosition);
    socket.on("tryShoot", () => this.onTryShoot);
  }

  private onShipSpeed(speed: number) {
    this.ship.speed_requested = speed;
  }

  private onRudderPosition(position: number) {
    this.ship.rudderAngleRequested = position;
  }

  private onGunAngleHorizontal(angle: number) {
    this.ship.gun.angleHorizontalRequested = angle;
  }

  private onGunAngleVertical(angle: number) {
    this.ship.gun.angleVerticalRequested = angle;
  }

  private onTryShoot() {
    const shell: Shell = new Shell();
    shell.pos = this.ship.pos.toVector3();
    shell.velocity = new Vector3(this.ship.gun.angleHorizontalActual, this.ship.gun.angleVerticalActual);
    shell.velocity.multiply(this.ship.gun.velocity);
    this.delegate.onPlayerShot(this, shell);
  }
}