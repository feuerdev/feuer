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

export default class GameServer implements PlayerDelegate {

  public io: socketio.Server;

  private players: Player[] = [];
  private shells: Shell[] = [];
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
  }

  updateNet(delta) {
  }

  //#region Playerdelegate
  onPlayerDisconnected(player: Player) {
    const i = this.players.indexOf(player);
    this.players.splice(i, 1);
    Log.info("Player Disconnected: " + this.players);
  }
  onPlayerShot(player: Player, shell: any) {
    this.shells.push[shell];
  }
  //#endregion
};
