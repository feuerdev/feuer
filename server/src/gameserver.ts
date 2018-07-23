/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */
import config from "./util/config";
import Log from "./util/log";
import * as socketio from "socket.io";
import { Server } from "http";
import Player, { PlayerDelegate } from "./player";
import Shell from "./shell";
import Ship from "./ship";
import Gun from "./gun";
import Vector3 from "./util/vector3";
import * as Util from "./util/util";

const GRAVITY: Vector3 = new Vector3(0, 0, -0.01);
const SPEEDFACTOR: number = 0.01;
const ACCELFACTOR: number = 0.1;
const RUDDERFACTOR: number = 0.4;
const ORIENTATIONFACTOR: number = 0.1;
const GUNHORIZONTALFACTOR: number = 0.1;
const GUNVERTICALFACTOR: number = 0.01;

export default class GameServer implements PlayerDelegate {

  public io: socketio.Server;

  private players: Player[] = [];
  private shells: Shell[] = [];
  private ships: Ship[] = [];
  private isRunning = false;

  private mapWidth:number = 3000;
  private mapHeight:number = 1000;

  //#region Gameloop Variables
  private readonly delta = Math.round(1000 / config.updaterate);
  private readonly netrate = Math.round(1000 / config.netrate);
  private lastTime = Date.now();
  private accumulator = 0;
  private timeSinceLastUpdate = 0;
  //#endregion

  listen(httpServer: Server) {
    this.io = socketio(httpServer, { transports: config.transports });
    this.io.on("connection", (socket) => {
      const newPlayer: Player = new Player(socket);
      newPlayer.delegate = this;
      this.players.push(newPlayer);
      this.ships.push(newPlayer.ship);

      
      Log.info("Player Connected: " + this.players);
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
        this.update(this.delta);
        this.accumulator -= this.delta;
      }

      if (this.timeSinceLastUpdate > this.netrate) {
        this.updateNet(this.timeSinceLastUpdate);
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
  update(delta) {
    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];

      const ship: Ship = player.ship;


      ship.speed_actual += (ship.speed_requested - ship.speed_actual) * ship.acceleration * ACCELFACTOR;
      ship.speed_actual = Util.clamp(ship.speed_actual, ship.speed_min, ship.speed_max);

      ship.rudderAngleActual += (ship.rudderAngleRequested - ship.rudderAngleActual) * RUDDERFACTOR;
      ship.rudderAngleActual = Util.clamp(ship.rudderAngleActual, -90, 90);

      ship.orientation += ship.rudderAngleActual * ship.turnSpeed * ship.speed_actual * ORIENTATIONFACTOR;
      ship.orientation = Util.mod(ship.orientation, 360);

      ship.pos.x += Math.cos(Util.scale(ship.orientation, 0, 360, 0, Math.PI * 2)) * ship.speed_actual * SPEEDFACTOR;
      ship.pos.y += Math.sin(Util.scale(ship.orientation, 0, 360, 0, Math.PI * 2)) * ship.speed_actual * SPEEDFACTOR;

      ship.pos.x = Util.clamp(ship.pos.x,0,this.mapWidth);
      ship.pos.y = Util.clamp(ship.pos.y,0,this.mapHeight);

      const gun: Gun = ship.gun;

      gun.angleHorizontalActual = gun.angleHorizontalRequested;
      // gun.angleHorizontalActual += (gun.angleHorizontalRequested - gun.angleHorizontalActual) * gun.turnspeed * GUNHORIZONTALFACTOR; 
      gun.angleHorizontalActual = Util.clamp(gun.angleHorizontalActual, gun.minAngleHorizontal, gun.maxAngleHorizontal);
      gun.angleVerticalActual = gun.angleVerticalRequested;
      // gun.angleVerticalActual += (gun.angleVerticalRequested - gun.angleVerticalActual) * gun.turnspeed * GUNVERTICALFACTOR;
      gun.angleVerticalActual = Util.clamp(gun.angleVerticalActual, gun.minAngleVertical, gun.maxAngleVertical);
      gun.timeSinceLastShot+=delta;
    }

    for (let i = this.shells.length - 1; i >= 0; i--) { //iterate backwards so its no problem to remove a shell while looping
      const shell: Shell = this.shells[i];

      shell.velocity.add(GRAVITY);
      // shell.velocity.add(wind);
      shell.pos.add(shell.velocity);

      if (shell.pos.z < 0) {
        this.players.forEach((player: Player) => {          
            if ((Math.abs(shell.pos.x - player.ship.pos.x) <= shell.size + player.ship.width)
              && (Math.abs(shell.pos.y - player.ship.pos.y) <= shell.size + player.ship.width)) {
              player.socket.disconnect();
            }
        });
        this.shells.splice(i, 1);
      }
    }
  }

  updateNet(delta) {
    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      player.socket.emit("gamestate ships", this.ships);
      player.socket.emit("gamestate shells", this.shells);
    }
  }

  //#region Playerdelegate
  onPlayerDisconnected(player: Player) {
    const i = this.players.indexOf(player);
    this.players.splice(i, 1);
    const j = this.ships.indexOf(player.ship);
    this.ships.splice(j, 1);
    Log.info("Player Disconnected: " + this.players);
  }
  onPlayerShot(player: Player, shell: any) {
    if(player.ship.gun.canShoot()) {
      player.ship.gun.timeSinceLastShot = 0;
      this.shells.push(shell);
    }
  }
  //#endregion
};
