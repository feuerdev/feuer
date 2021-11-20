import { io, Socket } from "socket.io-client"

export interface ConnectionListener {
  onDisconnected(socket: Socket): void
  onConnected(socket: Socket): void
  onSetup(socket: Socket): void
}

export default class Connection {
  private readonly socket: Socket

  private listeners: ConnectionListener[] = []

  constructor(ip: string) {
    this.socket = io(ip, { transports: ["websocket"] })
    this.socket.on("connect", () => this.onConnected())
    this.socket.on("disconnect", () => this.onDisconnected)
  }

  private onConnected() {
    const self = this
    function waitForUid() {
      if (currentUid) {
        for (let listener of self.listeners) {
          listener.onSetup(self.socket)
          listener.onConnected(self.socket)
        }
        self.socket.emit("initialize", currentUid)
      } else {
        console.log("uid not set yet. trying again...")
        setTimeout(waitForUid, 300)
      }
    }
    waitForUid()
  }

  private onDisconnected() {
    for (let listener of this.listeners) {
      listener.onDisconnected(this.socket)
    }
  }

  public send(tag: string, data: any) {
    if (this.socket) {
      this.socket.emit(tag, data)
    }
  }

  public addListener(listener: ConnectionListener) {
    this.listeners.push(listener)
  }

  public removeListener(listener: ConnectionListener) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }
}

declare const currentUid: string
