
import * as io from "./lib/socket.io.min";
import { Socket } from "../../node_modules/@types/socket.io";
import Log from "./util/log";

export interface ConnectionListener {
  onDisconnected(socket: Socket);
  onConnected(socket: Socket);
  onSetup(socket: Socket);
}

export default class Connection {

  private readonly socket: Socket;

  private listeners: ConnectionListener[] = [];

  constructor(ip, transports) {
    this.socket = io.connect(ip, { transports: transports });
    this.socket.on("connect", () => this.onConnected());
    this.socket.on("disconnect", () => this.onDisconnected);
  }

  private onConnected() {
    const self = this;
    function waitForUid() {
      if (currentUid) {
        for (let listener of self.listeners) {
          listener.onSetup(self.socket);
          listener.onConnected(self.socket);
        }
        self.socket.emit("initialize", currentUid);
      } else {
        console.log("uid not set yet. trying again...");
        setTimeout(waitForUid, 300);
      }
    }
    waitForUid();
    
  }

  private onDisconnected() {
    for (let listener of this.listeners) {
      listener.onDisconnected(this.socket);
    }
  }

  public addListener(listener: ConnectionListener) {
    this.listeners.push(listener);
  }

  public removeListener(listener: ConnectionListener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}

declare const currentUid;