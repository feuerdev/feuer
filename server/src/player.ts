import { Socket } from "../../node_modules/@types/socket.io";
import Ship from "./ship";
import Shell from "./shell";
import Vector3 from "./util/vector3";
import Vector2 from "./util/vector2";

export interface PlayerDelegate {
  onPlayerDisconnected(player: Player);
  onPlayerShot(player: Player, shell: Shell);
}

export default class Player {
  public socket: Socket;
  public delegate: PlayerDelegate;

  public teamId: number;

  public ship: Ship;

  constructor(delegate:PlayerDelegate, socket: Socket) {
    this.socket = socket;
    this.delegate = delegate;
    socket.on("disconnect", () => this.delegate.onPlayerDisconnected(this));
    socket.on("input speed", (data) => this.onShipSpeed(data));
    socket.on("input gun horizontal", (data) => this.onGunAngleHorizontal(data));
    socket.on("input gun vertical", (data) => this.onGunAngleVertical(data));
    socket.on("input rudder", (data) => this.onRudderPosition(data));
    socket.on("input waypoint", (data) => this.onWaypoint(data));
    socket.on("input shoot", () => this.onTryShoot());
  }

  private onWaypoint(waypoint: {x,y}) {
    this.ship.waypoint = new Vector2(waypoint.x, waypoint.y);
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
    shell.velocity = new Vector3(this.ship.gun.angleHorizontalActual+this.ship.orientation, this.ship.gun.angleVerticalActual).multiply(this.ship.gun.velocity);
    this.delegate.onPlayerShot(this, shell);
  }
}