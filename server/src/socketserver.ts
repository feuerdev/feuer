/**
 * Behandelt die Socket Io Verbindungen
 * Created by geller on 26.11.2016.
 */
import * as socketio from "socket.io";
import config from "./util/config";
import Webserver from "./webserver";
import { Server } from "http";

export default class SocketServer {

  public io: socketio.Server;
  private httpServer: Server;
  
  constructor(httpServer: Server) {
    this.httpServer = httpServer;
  }

  run() {
    this.io = socketio(this.httpServer, {
      transports: config.transports
    });
  }
};