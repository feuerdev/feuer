/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */
import config from "./util/config";
import Log from "./util/log";
import { ServerSocketDelegate } from "./socketserver"

export default class GameServer implements ServerSocketDelegate {
  

  private players = [];
  private isRunning = false;
  // private world = new World();

  private readonly delta = Math.round(1000 / config.updaterate);
  private readonly netrate = Math.round(1000 / config.netrate);
  private lastTime = Date.now();
  private accumulator = 0;
  private timeSinceLastUpdate = 0;


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

  event1() {
    Log.info("Event1");
  }

  //SocketDelegat
  onConnection(socket: SocketIO.Socket) {

    socket.on("event1", this.event1);

    this.players.push(socket.client.id);
    Log.info("Player Connected: "+this.players);
  }
  onDisconnect(socket: SocketIO.Socket) {
    const idx = this.players.indexOf(socket.client.id);
    this.players.splice(idx, 1);
    Log.info("Player Disconnected: "+this.players);
  }
};
