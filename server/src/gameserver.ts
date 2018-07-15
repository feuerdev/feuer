/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */
import config from "./util/config";
import Log from "./util/log";
import * as socketio from "socket.io";
import { Server } from "http";

export default class GameServer {
  
  public io: socketio.Server;  

  private players = [];
  private isRunning = false;

  private readonly delta = Math.round(1000 / config.updaterate);
  private readonly netrate = Math.round(1000 / config.netrate);
  private lastTime = Date.now();
  private accumulator = 0;
  private timeSinceLastUpdate = 0;

  listen(httpServer: Server) {
    this.io = socketio(httpServer, { transports: config.transports });
    this.io.on("connection", (socket) => {
      Log.info("Player Connected: "+this.players);
      this.players.push(socket.client.id);      
      socket.on("disconnect", a);
      socket.on("eventA", onEventA);
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
      } else {
        setTimeout(gameloop, 500);
      }
    }
    gameloop();
  }

  pause() {
    this.isRunning = false;
  }

  resume() {
    this.isRunning = true;
  }

  //Loops
  update(delta) {
    // console.log("delta:"+delta);
    //this.world.update(delta);
  }

  updateNet(delta) {
    // console.log("netdelta:"+delta);
  }


  //#region SocketEvents
  onDisconnect(socket: socketio.Socket) {
    const idx = this.players.indexOf(socket.client.id);
    this.players.splice(idx, 1);
    Log.info("Player Disconnected: "+this.players);
  }
};
