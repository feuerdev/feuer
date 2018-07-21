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

const GRAVITY: Vector3 = new Vector3(0,0,-0.1);

export default class GameServer implements PlayerDelegate {

  public io: socketio.Server;

  private players: Player[] = [];
  private shells: Shell[] = [];
  private ships: Ship[] = [];
  private isRunning = false;

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
    for(let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      
      const ship: Ship = player.ship;
      ship.rudderAngleActual += (ship.rudderAngleRequested - ship.rudderAngleActual) * ship.turnSpeed;
      ship.speed_actual += (ship.speed_requested - ship.speed_actual) * ship.acceleration;
      ship.orientation += ship.rudderAngleActual * ship.turnSpeed;
      ship.pos.x += Math.sin(ship.orientation) * ship.speed_actual;
      ship.pos.y += Math.cos(ship.orientation) * ship.speed_actual;

      const gun: Gun = ship.gun;
      gun.angleHorizontalActual += (gun.angleHorizontalRequested - gun.angleHorizontalActual) * gun.turnspeed; 
      gun.angleVerticalActual += (gun.angleVerticalRequested - gun.angleVerticalActual) * gun.turnspeed;
    }

    for(let i = this.shells.length; i > 0 ; i--) { //iterate backwards so its no problem to remove a shell while looping
      const shell: Shell = this.shells[i];

      shell.velocity.add(GRAVITY);
      // shell.velocity.add(wind);
      shell.pos.add(shell.velocity);

      if(shell.pos.z < 0) {
        //TODO: Check for hit
        this.shells.splice(i, 1);
      }
    }
  }

  updateNet(delta) {
    for(let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      player.socket.emit("ships", this.ships);
      player.socket.emit("shells", this.shells);
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
    this.shells.push[shell];
  }
  //#endregion
};
