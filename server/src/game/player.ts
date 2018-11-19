import { Socket } from "socket.io";
import Ship from "./ship";
import Shell from "./shell";
import Vector2 from "../../../shared/vector2";
import Vector3 from "../../../shared/vector3";
import Log from "../util/log";
import * as db from "../util/db";


export interface PlayerDelegate {
  onPlayerInitialized(player: Player);
  onPlayerDisconnected(player: Player);
  onPlayerShot(player: Player, shell: Shell);
}

export default class Player {
  public socket: Socket;
  public delegate: PlayerDelegate;

  public teamId: number;

  public ship: Ship;
  public uid: string;
  private name: string;

  constructor(delegate: PlayerDelegate, socket: Socket) {
    this.socket = socket;
    this.delegate = delegate;
    socket.on("disconnect", () => this.delegate.onPlayerDisconnected(this));
    socket.on("initialize", (data) => this.onInfoPlayer(data));
    socket.on("input speed", (data) => this.onShipSpeed(data));
    socket.on("input gun horizontal", (data) => this.onGunAngleHorizontal(data));
    socket.on("input gun vertical", (data) => this.onGunAngleVertical(data));
    socket.on("input rudder", (data) => this.onRudderPosition(data));
    socket.on("input shoot", () => this.onTryShoot());
  }

  private onInfoPlayer(uid: string) {
    this.uid = uid;
    const self = this;
    db.queryWithValues("SELECT username FROM users WHERE uid LIKE (?)", uid, function (error, results, fields) {
      if (error) {
        Log.error(error);
      } else {
        if (results.length >= 1) {
          const username = results[0].username;
          self.socket.emit("info username", username);
          self.name = username;
          Log.info("Player Connected: " + username);
          self.ship = new Ship(uid);
          self.ship.username = username;
          self.delegate.onPlayerInitialized(self);
        }
      }
    });
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
    const shell: Shell = new Shell(this.uid);
    shell.pos = this.ship.pos.toVector3();
    shell.velocity = new Vector3(this.ship.gun.angleHorizontalActual + this.ship.orientation, this.ship.gun.angleVerticalActual).multiply(this.ship.gun.velocity);
    this.delegate.onPlayerShot(this, shell);
  }
}