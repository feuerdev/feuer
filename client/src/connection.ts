import { io, Socket } from "socket.io-client"
import { Battle, Building, Group, Tile } from "../../shared/objects"
import PlayerRelation from "../../shared/relation"
import { Hashtable } from "../../shared/util"

export interface ConnectionListener {
  onDisconnected(socket: Socket): void
  onConnected(socket: Socket): void
  onTilesReceived(tiles: Hashtable<Tile>): void
  onGroupsReceived(groups: Hashtable<Group>): void
  onBattlesReceived(battles: Battle[]): void
  onBuildingsReceived(buildings: Building[]): void
  onRelationReceived(relation: PlayerRelation): void
}

export default class Connection {
  private readonly socket: Socket
  private uid: string
  listener: ConnectionListener

  constructor(ip: string, uid: string) {
    this.uid = uid
    this.socket = io(ip, { transports: ["websocket"] })
    this.socket.on("connect", () => this.onConnected())
    this.socket.on("disconnect", () => this.onDisconnected)
  }

  private onConnected() {
    this.listener.onConnected(this.socket)
    this.socket.on("gamestate tiles", (tiles: Hashtable<Tile>) => {
      this.listener.onTilesReceived(tiles)
    })
    this.socket.on("gamestate groups", (groups: Hashtable<Group>) => {
      this.listener.onGroupsReceived(groups)
    })
    this.socket.on("gamestate battles", (battles: Battle[]) => {
      this.listener.onBattlesReceived(battles)
    })
    this.socket.on("gamestate buildings", (buildings: Building[]) => {
      this.listener.onBuildingsReceived(buildings)
    })
    this.socket.on("gamestate relation", (relation: PlayerRelation) => {
      this.listener.onRelationReceived(relation)
    })
    this.socket.emit("initialize", this.uid)
  }

  private onDisconnected() {
    this.listener.onDisconnected(this.socket)
  }

  public send(tag: string, data: any) {
    if (this.socket) {
      this.socket.emit(tag, data)
    }
  }
}
