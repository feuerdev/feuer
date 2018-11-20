import Ship from "./ship";
import { Socket } from "socket.io";

export default class Player {

  constructor(socket: Socket) {
    this.socket = socket;
  }

  public socket: Socket;
  public teamId: number;
  public ship: Ship;
  public uid: string;
  public name: string;
  public initialized: boolean = false; 
}