export interface GameloopListener {
  onUpdate?(deltafactor: number);
  onUpdateNet?(deltafactor: number);
  onRender?();
}

export default class Gameloop {

  public static requestAnimationFrameWrapper: Function = (function () {
    return (window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 30);
        }).bind(window);
  })();

  private readonly listeners:GameloopListener[] = [];
  private readonly referenceDelta = Math.round(1000 / 30);
  private readonly referenceNetDelta = Math.round(1000 / 20);
  private isRunning = false;
  private lastTime = Date.now();
  private accumulator = 0;
  private timeSinceLastUpdate = 0;

  private readonly netDelta;
  private readonly delta;
  private readonly loopFunction:Function;

  constructor(loopFunction, updateRate, netRate) {
    this.loopFunction = loopFunction;
    this.delta = 1000 / updateRate;
    this.netDelta = 1000 / netRate;
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
        for(let listener of this.listeners) {
          if(listener.onUpdate) {
            listener.onUpdate(this.delta / this.referenceDelta);
          }
        }
        this.accumulator -= this.delta;
      }

      if (this.timeSinceLastUpdate > this.netDelta) {
        for(let listener of this.listeners) {
          if(listener.onUpdate) {
            listener.onUpdateNet(this.timeSinceLastUpdate / this.referenceNetDelta);
          }
        }
        this.timeSinceLastUpdate = 0;
      }
      
      for(let listener of this.listeners) {
        if(listener.onRender) {
          listener.onRender();
        }
      }

      if (this.isRunning) {
        this.loopFunction(gameloop);
      }
    }
    gameloop();
  }

  stop() {
    this.isRunning = false;
  }

  addListener(listener:GameloopListener) {
    this.listeners.push(listener);
  }

  removeListener(listener:GameloopListener) {
    const index = this.listeners.indexOf(listener);
    if(index > -1) {
      this.listeners.splice(index, 1);
    }
  }

}

interface Window {
  mozRequestAnimationFrame: Function;
  oRequestAnimationFrame: Function;
  msRequestAnimationFrame: Function;
  requestAnimationFrame: Function;
  webkitRequestAnimationFrame: Function;
  setTimeout: Function;
  addEventListener: Function;
}
declare const window: Window;