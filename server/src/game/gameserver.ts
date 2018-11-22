/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */

import * as socketio from "socket.io";
import { Server } from "http";

import Shell from "./shell";
import Ship from "./ship";
import Gun from "./gun";
import Player from "./player";
import Helper from "./helper";

import * as db from "../util/db";
import * as Util from "../../../shared/util";
import Log from "../util/log";
import config from "../util/config";
import Vector2 from "../../../shared/vector2";
import Vector3 from "../../../shared/vector3";
import { Socket } from "socket.io";

const GRAVITY: Vector3 = new Vector3(0, 0, config.gravity);

export default class GameServer {
  private io: socketio.Server;

  private socketplayer: {} = {};
  private uidsockets: {} = {};
  private players: Player[] = [];
  private shells: Shell[] = [];

  private mapWidth: number = config.map_width;
  private mapHeight: number = config.map_height;

  //#region Gameloop Variables
  private readonly delta = Math.round(1000 / config.updaterate);
  private readonly defaultDelta = Math.round(1000 / 60);
  private readonly netrate = Math.round(1000 / config.netrate);
  private readonly defaultNetrate = Math.round(1000 / 30);
  private isRunning = false;
  private lastTime = Date.now();
  private accumulator = 0;
  private timeSinceLastUpdate = 0;
  //#endregion

  //helper
  private lastTeamId = 0;

  listen(httpServer: Server) {
    this.io = socketio(httpServer, { transports: config.transports });
    this.io.on("connection", (socket) => {
      socket.emit("info mapwidth", this.mapWidth);
      socket.emit("info mapheight", this.mapHeight);
      socket.on("initialize", (data) => this.onPlayerInitialize(socket, data));
      socket.on("input speed", (data) => this.onPlayerInputShipSpeed(socket, data));
      socket.on("input gun horizontal", (data) => this.onPlayerInputGunAngleHorizontal(socket, data));
      socket.on("input gun vertical", (data) => this.onPlayerInputGunAngleVertical(socket, data));
      socket.on("input rudder", (data) => this.onPlayerInputRudderPosition(socket, data));
      socket.on("input shoot", () => this.onPlayerInputShoot(socket));
      socket.on("disconnect", () => this.onPlayerDisconnected(socket));
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
    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      if (player.initialized) {
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
    }

    for (let i = this.shells.length - 1; i >= 0; i--) { //iterate backwards so its no problem to remove a shell while looping
      const shell: Shell = this.shells[i];

      shell.velocity = shell.velocity.add(GRAVITY.multiply(deltaFactor));
      // const windVector: Vector3 = new Vector3(0.01,0,0);
      // shell.velocity = shell.velocity.add(windVector);
      shell.pos = shell.pos.add(shell.velocity);

      if (shell.pos.z < 0) {
        for (let j = 0; j < this.players.length; j++) {
          const player = this.players[j];
          if (player.initialized) {
            if ((Math.abs(shell.pos.x - player.ship.pos.x) <= shell.size + player.ship.width)
              && (Math.abs(shell.pos.y - player.ship.pos.y) <= shell.size + player.ship.width)) { //TODO: Fix Hitboxes
              player.ship.hitpoints -= shell.damage;
              if (player.ship.hitpoints <= 0) {
                const killer: Player = shell.owner;
                const killed: Player = player;
                this.onPlayerKilled(killer, killed);
                break;
              }
            }
          }
        };
        this.shells.splice(i, 1);
      }
    }
  }

  onPlayerKilled(killer: Player, killed: Player) {
    this.removePlayer(killed);
    const socket: Socket = this.uidsockets[killed.uid]
    socket.emit("gamestate death");
    delete this.uidsockets[killed.uid];
    delete this.socketplayer[socket.id];
    this.updateKillStatistic(killer, killed);
  }

  removePlayer(player: Player) {
    const index = this.players.indexOf(player);
    if (index !== -1) {
      this.players.splice(index, 1);
    }
  }

  updateKillStatistic(killer: Player, killed: Player): any {
    db.queryWithValues("INSERT INTO kills (killer, killed) VALUES (?, ?)", [killer.uid, killed.uid], function (error, results, fields) {
      if (error) {
        console.log(error);
      } else {
        console.log("updated kill db");
      }
    });
  }

  updateNet(delta) {
    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      if (player.initialized) {
        const socket: Socket = this.uidsockets[player.uid];
        if (socket) {
          socket.emit("gamestate players", this.players);
          socket.emit("gamestate shells", this.shells);
        }
      }
    }
  }

  onPlayerDisconnected(socket: Socket) {
    // const i = this.players.indexOf(player);
    // if (i != -1) {
    //   this.players.splice(i, 1);
    // }
    // delete this.sockets[player.uid];
    const player: Player = this.socketplayer[socket.id];
    if(player) {
      Log.info("Player Disconnected: " + player.name);
    }
  }
  onPlayerInitialize(socket: Socket, uid: string) {
    const self = this;
    if (!this.uidsockets[uid]) {
      Helper.getUsername(uid)
        .then((name) => {
          const player: Player = new Player();
          player.uid = uid;
          player.name = name;
          player.teamId = this.lastTeamId;
          player.ship = new Ship();
          player.ship.pos = Helper.requestSpawnPosition(player.teamId, self.mapWidth, self.mapHeight);
          player.ship.orientation = Helper.requestSpawnOrientation(player.teamId);
          player.initialized = true;
          self.players.push(player);
          self.socketplayer[socket.id] = player;
          Log.info("Player Connected: " + player.name);
          self.lastTeamId = self.lastTeamId === 0 ? 1 : 0;

        })
        .catch(error => {
          Log.error(error);
        });
    } else {
      for(let i = 0; i < self.players.length; i++) {
        if(self.players[i].uid === uid) {
          this.socketplayer[socket.id] = self.players[i];
        } 
      }
    }
    this.uidsockets[uid] = socket;
  }
  onPlayerInputShoot(socket: Socket) {
    const player: Player = this.socketplayer[socket.id];
    if (player && player.initialized) {
      if (player.ship.gun.canShoot()) {
        player.ship.gun.timeSinceLastShot = 0;
        const shell: Shell = new Shell(player);
        shell.pos = player.ship.pos.toVector3();
        shell.velocity = new Vector3(player.ship.gun.angleHorizontalActual + player.ship.orientation, player.ship.gun.angleVerticalActual).multiply(player.ship.gun.velocity);
        this.shells.push(shell);
      }
    }
  }
  private onPlayerInputShipSpeed(socket: Socket, speed: number) {
    const player: Player = this.socketplayer[socket.id];
    if (player && player.initialized) {
      player.ship.speed_requested = speed;
    }
  }
  private onPlayerInputGunAngleHorizontal(socket: Socket, angle: number) {
    const player: Player = this.socketplayer[socket.id];
    if (player && player.initialized) {
      player.ship.gun.angleHorizontalRequested = angle;
    }
  }
  private onPlayerInputGunAngleVertical(socket: Socket, angle: number) {
    const player: Player = this.socketplayer[socket.id];
    if (player && player.initialized) {
      player.ship.gun.angleVerticalRequested = angle;
    }
  }
  private onPlayerInputRudderPosition(socket: Socket, position: number) {
    const player: Player = this.socketplayer[socket.id];
    if (player && player.initialized) {
      player.ship.rudderAngleRequested = position;
    }
  }
};
