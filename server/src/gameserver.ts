/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */
import config from "./util/config";

export default class GameServer {

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
  
    if(this.isRunning) {
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



};
