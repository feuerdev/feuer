/**
 * Behandelt die Socket Io Verbindungen
 * Created by geller on 26.11.2016.
 */
import * as socketio from "socket.io";
import config from "./util/config";
import { Server } from "http";
import Log from "./util/log";

export interface ServerSocketDelegate {
  onConnection(socket: socketio.Socket);
  onDisconnect(socket: socketio.Socket);
}

export default class SocketServer {

  public delegate: ServerSocketDelegate;
  public io: socketio.Server;
  private httpServer: Server;

  constructor(httpServer: Server) {
    this.httpServer = httpServer;
  }

  run() {
    this.io = socketio(this.httpServer, {
      transports: config.transports
    });
    this.io.on("connection", (socket) => {
      socket.on("disconnect", () => {this.delegate.onDisconnect(socket)});
      this.delegate.onConnection(socket);
    });
  }
};