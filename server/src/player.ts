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
  public ship: Ship;

  public delegate: PlayerDelegate;

  constructor(socket: Socket) {
    this.socket = socket;

    this.ship = new Ship();

    socket.on("disconnect", () => this.delegate.onPlayerDisconnected);
    socket.on("tryShoot", () => this.onTryShoot);
  }

  private onTryShoot() {
    const shell: Shell = new Shell();

    shell.pos = this.ship.pos;

    const vec = new Vector3();
    vec.x = Math.cos(this.ship.gun.angleHorizontal)*Math.cos(this.ship.gun.angleHorizontal);
    vec.y = Math.sin(this.ship.gun.angleHorizontal)*Math.cos(this.ship.gun.angleHorizontal);
    vec.z = Math.sin(this.ship.gun.angleHorizontal);
    vec.normalize();

    shell.vec = vec;
    shell.velocity = this.ship.gun.velocity;

    this.delegate.onPlayerShot(this, shell);
  }


}