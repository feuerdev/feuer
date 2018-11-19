/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */
import config from "../util/config";
import * as db from "../util/db";
import Log from "../util/log";
import * as socketio from "socket.io";
import { Server } from "http";
import Player, { PlayerDelegate } from "./player"
import Shell from "./shell";
import Ship from "./ship";
import Gun from "./gun";
import * as Util from "../../../shared/util";
import Vector2 from "../../../shared/vector2";
import Vector3 from "../../../shared/vector3";

const GRAVITY: Vector3 = new Vector3(0, 0, config.gravity);

export default class GameServer implements PlayerDelegate {
  public io: socketio.Server;

  private initializedPlayers: Player[] = [];
  private shells: Shell[] = [];
  private ships: Ship[] = [];
  private isRunning = false;

  private mapWidth: number = 1880;
  private mapHeight: number = 1000;

  //#region Gameloop Variables
  private readonly delta = Math.round(1000 / config.updaterate);
  private readonly defaultDelta = Math.round(1000 / 60);
  private readonly netrate = Math.round(1000 / config.netrate);
  private readonly defaultNetrate = Math.round(1000 / 30);
  private lastTime = Date.now();
  private accumulator = 0;
  private timeSinceLastUpdate = 0;
  //#endregion

  private lastTeamId = 0;

  listen(httpServer: Server) {
    this.io = socketio(httpServer, { transports: config.transports });
    this.io.on("connection", (socket) => {


      socket.emit("info mapwidth", this.mapWidth);
      socket.emit("info mapheight", this.mapHeight);

      const newPlayer: Player = new Player(this, socket);
    });
  }

  run() {
    this.isRunning = true;
    let gameloop = () => {
      let newTime = Date.now();
      let frameTime = newTime - this.lastTime;

      this.lastTime = newTime;

      this.timeSinceLastUpdate += frameTime;
      this.accumulator += frameTime;

      while (this.accumulator > this.delta) {
        this.update(this.delta / this.defaultDelta);
        this.accumulator -= this.delta;
      }

      if (this.timeSinceLastUpdate > this.netrate) {
        this.updateNet(this.timeSinceLastUpdate / this.defaultNetrate);
        this.timeSinceLastUpdate = 0;
      }

      if (this.isRunning) {
        setImmediate(gameloop);
      }
    }
    gameloop();
  }

  pause() {
    Log.info("Game paused");
    this.isRunning = false;
  }

  resume() {
    Log.info("Game resumed");
    this.lastTime = Date.now(); //lastTime zurücksetzen, damit die pausierte Zeit nicht nachgeholt wird
    this.run();
  }

  //Loops
  update(deltaFactor) {
    for (let i = 0; i < this.initializedPlayers.length; i++) {
      const player: Player = this.initializedPlayers[i];

      const ship: Ship = player.ship;

      ship.speed_actual += Util.clamp(ship.speed_requested - ship.speed_actual, -1, 1) * ship.acceleration * deltaFactor;
      ship.speed_actual = Util.clamp(ship.speed_actual, ship.speed_min, ship.speed_max);

      ship.rudderAngleActual += (ship.rudderAngleRequested - ship.rudderAngleActual) * config.factor_rudder * deltaFactor;
      ship.rudderAngleActual = Util.clamp(ship.rudderAngleActual, -90, 90);

      ship.orientation += ship.rudderAngleActual * ship.turnSpeed * ship.speed_actual * config.factor_orientation * deltaFactor;
      ship.orientation = Util.mod(ship.orientation, 360);

      ship.pos.x += Math.cos(Util.degreeToRadians(ship.orientation)) * ship.speed_actual * config.factor_speed * deltaFactor;
      ship.pos.y += Math.sin(Util.degreeToRadians(ship.orientation)) * ship.speed_actual * config.factor_speed * deltaFactor;

      ship.pos.x = Util.clamp(ship.pos.x, 0, this.mapWidth - ship.width);
      ship.pos.y = Util.clamp(ship.pos.y, 0, this.mapHeight - ship.height);

      const gun: Gun = ship.gun;

      gun.angleHorizontalActual += Util.clamp(gun.angleHorizontalRequested - gun.angleHorizontalActual, -1, 1) * gun.turnspeedHorizontal * deltaFactor;
      gun.angleHorizontalActual = Util.clamp(gun.angleHorizontalActual, gun.minAngleHorizontal, gun.maxAngleHorizontal);
      gun.angleVerticalActual += Util.clamp(gun.angleVerticalRequested - gun.angleVerticalActual, -1, 1) * gun.turnspeedVertical * deltaFactor;
      gun.angleVerticalActual = Util.clamp(gun.angleVerticalActual, gun.minAngleVertical, gun.maxAngleVertical);
      gun.timeSinceLastShot += deltaFactor * this.delta;
    }

    for (let i = this.shells.length - 1; i >= 0; i--) { //iterate backwards so its no problem to remove a shell while looping
      const shell: Shell = this.shells[i];

      shell.velocity = shell.velocity.add(GRAVITY.multiply(deltaFactor));
      // const windVector: Vector3 = new Vector3(0.01,0,0);
      // shell.velocity = shell.velocity.add(windVector);
      shell.pos = shell.pos.add(shell.velocity);

      if (shell.pos.z < 0) {
        for (let j = 0; j < this.initializedPlayers.length; j++) {
          let player = this.initializedPlayers[j];
          if ((Math.abs(shell.pos.x - player.ship.pos.x) <= shell.size + player.ship.width)
            && (Math.abs(shell.pos.y - player.ship.pos.y) <= shell.size + player.ship.width)) {
            player.ship.hitpoints -= shell.damage;
            if (player.ship.hitpoints <= 0) {
              player.socket.emit("gamestate death");
              const killer = shell.owner;
              this.onPlayerDisconnected(player);
              this.updateKillStatistic(killer, player.uid);
              break;
            }
          }
        };
        this.shells.splice(i, 1);
      }
    }
  }

  updateKillStatistic(killer: string, killed: string): any {
    db.queryWithValues("INSERT INTO kills (killer, killed) VALUES (?, ?)", [killer, killed], function (error, results, fields) {
      if(error) {
        console.log(error);
      } else {
        console.log("updated kill db");
      }
    });
  }

  updateNet(delta) {
    for (let i = 0; i < this.initializedPlayers.length; i++) {
      const player: Player = this.initializedPlayers[i];
      let otherShips: Ship[] = Array.from(this.ships);
      for (let i = otherShips.length - 1; i >= 0; i--) {
        if (otherShips[i].owner === player.uid) {
          otherShips.splice(i, 1);
          break;
        }
      }
      player.socket.emit("gamestate ship", player.ship);
      player.socket.emit("gamestate ships", otherShips);
      player.socket.emit("gamestate shells", this.shells);
    }
  }

  requestSpawnOrientation(teamId: number): number {
    if (teamId === 0) {
      return 0;
    } else if (teamId === 1) {
      return 180;
    } else {
      throw Error("invalid teamId given");
    }
  }

  requestSpawnPosition(teamId: number): Vector2 {
    const margin = 50;
    const spawnboxWidth = 100;
    const spawnboxHeight = this.mapHeight;
    if (teamId === 0) {
      const x = Util.scale(Math.random(), 0, 1, margin, margin + spawnboxWidth);
      const y = Util.scale(Math.random(), 0, 1, margin, spawnboxHeight - margin);
      return new Vector2(x, y);
    } else if (teamId === 1) {
      const x = Util.scale(Math.random(), 0, 1, this.mapWidth - (margin + spawnboxWidth), this.mapWidth - margin);
      const y = Util.scale(Math.random(), 0, 1, margin, spawnboxHeight - margin);
      return new Vector2(x, y);
    } else {
      throw Error("invalid teamId given");
    }
  }

  //#region Playerdelegate
  onPlayerInitialized(player: Player) {
    player.ship.pos = this.requestSpawnPosition(this.lastTeamId);
    player.ship.orientation = this.requestSpawnOrientation(this.lastTeamId);
    player.ship.teamId = this.lastTeamId;
    player.socket.emit("info teamId", this.lastTeamId);
    this.lastTeamId = this.lastTeamId === 0 ? 1 : 0;
    this.ships.push(player.ship);
    this.initializedPlayers.push(player);
  }
  onPlayerDisconnected(player: Player) {
    const i = this.initializedPlayers.indexOf(player);
    this.initializedPlayers.splice(i, 1);
    const j = this.ships.indexOf(player.ship);
    this.ships.splice(j, 1);
    Log.info("Player Disconnected: " + this.initializedPlayers);
  }
  onPlayerShot(player: Player, shell: any) {
    if (player.ship.gun.canShoot()) {
      player.ship.gun.timeSinceLastShot = 0;
      this.shells.push(shell);
    }
  }
  //#endregion
};
