/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */
import { Server } from "socket.io"
import * as Http from "http"

import Player from "./player"
import Helper from "../helper"

import * as db from "../util/db"
import Log from "../util/log"
import config from "../util/config"
import * as Rules from "../../../shared/rules.json"
import { astar } from "../../../shared/pathfinding"
import { Socket } from "socket.io"
import { Hashtable } from "../../../shared/util"
import Tile from "./tile"
import World from "./world"
import Group from "./objects/group"
import Hex from "../../../shared/hex"
import Building from "./objects/building"
import PlayerRelation, { EnumRelationType } from "../../../shared/relation"
import Battle from "./objects/battle"

export default class GameServer {
  private socketplayer: {} = {}
  private uidsockets: {} = {}
  private players: Player[] = []

  private world: World

  //#region Gameloop Variables
  private readonly updaterate = Math.round(1000 / config.updaterate)
  private readonly defaultDelta = Math.round(1000 / config.referencerate)
  private isRunning = false
  //#endregion

  constructor(world: World) {
    this.world = world
  }

  listen(httpServer: Http.Server) {
    const socketServer = new Server(httpServer, {
      transports: config.transports,
    })
    socketServer.on("connection", (socket) => {
      socket.on("initialize", (data) => this.onPlayerInitialize(socket, data))

      const player = this.getPlayerBySocketId(socket.id)

      socket.on("disconnect", () => this.onPlayerDisconnected(socket))

      socket.on("request movement", (data) =>
        this.onRequestMovement(socket, data)
      )
      socket.on("request construction", (data) =>
        this.onRequestConstruction(socket, data)
      )
      socket.on("request relation", (data) =>
        this.onRequestRelation(socket, data)
      )
      socket.on("request disband", (data) =>
        this.onRequestDisband(socket, data)
      )
      socket.on("request transfer", (data) =>
        this.onRequestTransfer(socket, data)
      )
      socket.on("request unit add", (data) =>
        this.onRequestUnitAdd(socket, data)
      )
      socket.on("request unit remove", (data) =>
        this.onRequestUnitRemove(socket, data)
      )
      socket.on("request upgrade", (data) =>
        this.onRequestUpgrade(socket, data)
      )
      socket.on("request demolish", (data) =>
        this.onRequestDemolish(socket, data)
      )
    })
  }

  //Gameloop
  private previousTick = Date.now()
  private actualTicks = 0
  run() {
    this.isRunning = true

    let gameloop = () => {
      let timeSincelastFrame = Date.now() - this.previousTick
      this.previousTick = Date.now()
      this.actualTicks++
      let dbgStart = Date.now()
      this.update(this.updaterate / this.defaultDelta)
      let dbgAfterUpdate = Date.now()
      this.updateNet(this.updaterate / this.defaultDelta)
      let dbgAfterSend = Date.now()
      if (
        this.actualTicks > 5 &&
        Math.abs(timeSincelastFrame - this.updaterate) > 30
      ) {
        Log.error("Warning something is fucky with the gameloop")
      }
      Log.silly(
        "Update took:" +
          (dbgAfterUpdate - dbgStart) +
          " Sending Data to clients took:" +
          (dbgAfterSend - dbgAfterUpdate) +
          " Time since last Frame:" +
          timeSincelastFrame +
          " Gesamtticks:" +
          this.actualTicks +
          " Abweichung:" +
          (timeSincelastFrame - this.updaterate)
      )
    }
    setInterval(gameloop, this.updaterate)
  }

  pause() {
    Log.info("Game paused")
    this.isRunning = false
  }

  resume() {
    Log.info("Game resumed")
    this.run()
  }

  //Loops
  update(deltaFactor) {
    //Group Movement
    for (let i = 0; i < this.world.groups.length; i++) {
      const group: Group = this.world.groups[i]
      if (group.targetHexes.length > 0) {
        let currentTile = this.world.tiles[group.pos.hash()]
        group.movementStatus +=
          group.speed * currentTile.movementFactor * deltaFactor * 0.1 //TODO calculate correct movementcost
        if (group.movementStatus > 100) {
          //Movement!
          currentTile.removeSpot(group.id)
          group.pos = group.targetHexes.splice(0, 1)[0]
          this.world.tiles[group.pos.hash()].addSpot(
            group.getTexture(),
            group.id
          )
          group.movementStatus = 0
          this.updatePlayerVisibilities(group.owner)
          this.checkForBattle(group)
        }
      }
    }

    //Resource Gathering
    for (let building of this.world.buildings) {
      let tile = this.world.tiles[building.pos.hash()]
      for (let res of Object.keys(building.resourceGeneration)) {
        tile.resources[res] += building.resourceGeneration[res] * deltaFactor
      }
    }

    //Battles
    let i = this.world.battles.length
    while (i--) {
      let battle = this.world.battles[i]

      battle.aDefender.hp -=
        battle.aAttacker.attack + Math.round(Math.random() * 10)
      battle.aAttacker.hp -=
        battle.aDefender.attack + Math.round(Math.random() * 20)

      if (battle.aAttacker.hp <= 0 || battle.aDefender.hp <= 0) {
        if (battle.aAttacker.hp <= 0) {
          this.world.tiles[battle.pos.hash()].removeSpot(battle.aAttacker.id)
          this.world.groups.splice(
            this.world.groups.indexOf(battle.aAttacker),
            1
          )
          this.updatePlayerVisibilities(battle.aAttacker.owner)
        }
        if (battle.aDefender.hp <= 0) {
          this.world.tiles[battle.pos.hash()].removeSpot(battle.aDefender.id)
          this.world.groups.splice(
            this.world.groups.indexOf(battle.aDefender),
            1
          )
          this.updatePlayerVisibilities(battle.aDefender.owner)
        }
        this.world.battles.splice(i, 1)
      }
    }

    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i]
      if (player.initialized) {
        //TODO
      }
    }
  }

  checkForBattle(group: Group) {
    for (let other_group of this.world.groups) {
      if (
        other_group.pos.equals(group.pos) &&
        group.owner !== other_group.owner &&
        group.id !== other_group.id
      ) {
        if (
          this.world.playerRelations[
            PlayerRelation.getHash(group.owner, other_group.owner)
          ].relationType === EnumRelationType.rtHostile
        ) {
          this.world.battles.push(new Battle(group.pos, group, other_group))
        }
      }
    }
  }

  updateKillStatistic(killer: Player, killed: Player): any {
    db.queryWithValues(
      "INSERT INTO kills (killer, killed) VALUES (?, ?)",
      [killer.uid, killed.uid],
      function (error, results, fields) {
        if (error) {
          console.log(error)
        } else {
          console.log("updated kill db")
        }
      }
    )
  }

  updateNet(delta) {
    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i]
      if (player.initialized) {
        const socket: Socket = this.uidsockets[player.uid]
        if (socket && socket.connected) {
          socket.emit("gamestate players", this.players)
          let tiles = this.getTiles(player.visibleHexes)
          let groups = this.getVisibleGroups(player.visibleHexes)
          let battles = this.getVisibleBattles(player.visibleHexes)
          let buildings = this.getVisibleBuildings(player.visibleHexes)
          socket.emit("gamestate tiles", tiles)
          socket.emit("gamestate groups", groups)
          socket.emit("gamestate battles", battles)
          socket.emit("gamestate buildings", buildings)
        }
      }
    }
  }

  onPlayerDisconnected(socket: Socket) {
    const player: Player = this.socketplayer[socket.id]
    if (player) {
      Log.info("Player Disconnected: " + player.name)
    }
  }
  onPlayerInitialize(socket: Socket, uid: string) {
    const self = this
    if (!this.uidsockets[uid]) {
      Helper.getUsername(uid)
        .then((name) => {
          //Create new Player
          const player: Player = new Player()
          player.uid = uid
          player.name = name
          player.initialized = true

          //Give Player an initial Scout and Camp
          let pos = self.getRandomHex()
          let initialGroup = Group.createGroup(player.uid, "Scout", pos)
          self.world.groups.push(initialGroup)

          let initialCamp = Building.createBuilding(
            player.uid,
            "Town Hall",
            pos
          )
          // Building.updateBuilding(initialCamp);
          self.world.buildings.push(initialCamp)

          //Prepare Drawing of that group
          self.world.tiles[initialGroup.pos.hash()].addSpot(
            initialGroup.getTexture(),
            initialGroup.id
          )
          self.world.tiles[initialCamp.pos.hash()].addSpot(
            initialCamp.getTexture(),
            initialCamp.id
          )

          //Register player in Gamesever
          self.players.push(player)
          self.socketplayer[socket.id] = player
          Log.info("New Player Connected: " + player.name)

          this.updatePlayerVisibilities(uid)
        })
        .catch((error) => {
          Log.error(error)
        })
    } else {
      for (let i = 0; i < self.players.length; i++) {
        if (self.players[i].uid === uid) {
          this.socketplayer[socket.id] = self.players[i]
          Log.info("Old Player Connected: " + self.players[i].name)

          socket.emit(
            "gamestate discovered tiles",
            this.getTiles(self.players[i].discoveredHexes)
          )
        }
      }
    }
    this.uidsockets[uid] = socket
  }

  onRequestMovement(socket: Socket, data: any) {
    let uid = this.getPlayerUid(socket.id)
    let selection: number = data.selection
    let target: Hex = new Hex(data.target.q, data.target.r, data.target.s)
    for (let group of this.world.groups) {
      if (uid === group.owner && selection === group.id) {
        if (this.world.tiles[target.hash()]) {
          group.movementStatus = 0
          group.targetHexes = astar(this.world.tiles, group.pos, target)
          return
        }
      }
    }
  }

  onRequestConstruction(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    let pos = new Hex(data.pos.q, data.pos.r, data.pos.s)
    let tile = this.world.tiles[pos.hash()]

    if (this.isAllowedToBuild(tile, uid, data.type)) {
      let building = Building.createBuilding(uid, data.type, pos)
      this.world.buildings.push(building)
      tile.addSpot(building.texture, building.id)
      this.updatePlayerVisibilities(uid)
    }
  }

  onRequestRelation(socket: Socket, data) {
    let hash = PlayerRelation.getHash(data.id1, data.id2)
    let playerRelation = this.world.playerRelations[hash]
    if (!playerRelation) {
      playerRelation = new PlayerRelation(
        data.id1,
        data.id2,
        EnumRelationType.rtHostile
      )
      this.world.playerRelations[hash] = playerRelation
    }
    socket.emit("gamestate relation", playerRelation)
  }

  onRequestUnitAdd(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    let group = this.world.groups.find((group) => {
      return group.id === data.groupId && group.owner === uid
    })
    let tile = this.world.tiles[Hex.hash(group.pos)]
    let unit = tile.units.find((unit) => {
      return unit.id === data.unitId
    })
    if (group && unit) {
      tile.units.splice(tile.units.indexOf(unit), 1)
      group.units.push(unit)
    }
  }
  onRequestUnitRemove(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    let group = this.world.groups.find((group) => {
      return group.id === data.groupId && group.owner === uid
    })
    let tile = this.world.tiles[Hex.hash(group.pos)]
    if (group) {
      let unit = group.units.find((unit) => {
        return unit.id === data.unitId
      })
      if (unit) {
        group.units.splice(group.units.indexOf(unit), 1)
        tile.units.push(unit)
      }
    }
  }
  onRequestTransfer(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    let group = this.world.groups.find((group) => {
      return group.id === data.id && group.owner === uid
    })
    if (group) {
      let tile = this.world.tiles[group.pos.hash()]
      let amount = data.amount
      let resource = data.resource
      if (
        tile.resources[resource] + amount >= 0 &&
        group.resources[resource] - amount >= 0
      ) {
        tile.resources[resource] += amount
        group.resources[resource] -= amount //TODO: Check if allowed
      }
    }
  }

  onRequestDemolish(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    let buildingToDemolish = this.world.buildings.find((building) => {
      return building.id === data.buildingId && building.owner === uid
    })
    if (buildingToDemolish) {
      this.world.tiles[buildingToDemolish.pos.hash()].removeSpot(
        buildingToDemolish.id
      )
      this.world.buildings.splice(
        this.world.buildings.indexOf(buildingToDemolish),
        1
      )
      this.updatePlayerVisibilities(uid)
    }
  }

  onRequestUpgrade(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    let buildingToUpgrade = this.world.buildings.find((building) => {
      return building.id === data.buildingId && building.owner === uid
    })
    if (buildingToUpgrade) {
      //TODO: Check if has enogh money here and reduct money
      Building.upgradeBuilding(buildingToUpgrade)
      this.world.tiles[buildingToUpgrade.pos.hash()].removeSpot(
        buildingToUpgrade.id
      )
      this.world.tiles[buildingToUpgrade.pos.hash()].addSpot(
        buildingToUpgrade.texture,
        buildingToUpgrade.id
      ) //TODO: Should that be handled here?
      this.updatePlayerVisibilities(uid)
    }
  }

  onRequestDisband(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    let groupToDisband = this.world.groups.find((group) => {
      return group.id === data.id && group.owner === uid
    })
    if (groupToDisband) {
      this.world.tiles[groupToDisband.pos.hash()].removeSpot(groupToDisband.id)
      this.world.groups.splice(this.world.groups.indexOf(groupToDisband), 1)
      this.updatePlayerVisibilities(uid)
    }
  }

  private getPlayerUid(socketId): string {
    const player: Player = this.getPlayerBySocketId(socketId)
    if (player) {
      return player.uid
    }
    return null
  }

  private getPlayerBySocketId(socketId: string): Player {
    return this.socketplayer[socketId]
  }

  private getPlayerByUid(uid: string): Player {
    for (let player of this.players) {
      if (player.uid === uid) return player
    }
    return null
  }

  /**
   * Updates the player.discoveredHexes and player.visibleHexes. Call this method after something happens, that affects visibilities (movement, upgrades, deaths...)
   * @param uid player id
   */
  private updatePlayerVisibilities(uid: string) {
    let player: Player = this.getPlayerByUid(uid)
    player.visibleHexes = []

    if (player) {
      for (let group of this.world.groups) {
        if (group.owner === uid) {
          let visible: Hex[] = group.pos.neighborsRange(
            group.getSpottingRange()
          )
          this.addUniqueHexes(player.visibleHexes, visible)
          this.addUniqueHexes(player.discoveredHexes, visible)
        }
      }
      for (let building of this.world.buildings) {
        if (building.owner === uid) {
          let visible: Hex[] = building.pos.neighborsRange(
            building.getSpottingRange()
          )
          this.addUniqueHexes(player.visibleHexes, visible)
          this.addUniqueHexes(player.discoveredHexes, visible)
        }
      }
    }
  }

  private addUniqueHexes(hexarray: Hex[], newHexes: Hex[]) {
    for (let nHex of newHexes) {
      let found = false
      for (let h of hexarray) {
        if (nHex.equals(h)) {
          found = true
        }
      }
      if (!found) {
        hexarray.push(nHex)
      }
    }
  }

  private getTiles(hexes: Hex[]): Hashtable<Tile> {
    let result: Hashtable<Tile> = {}
    for (let hex of hexes) {
      result[hex.hash()] = this.world.tiles[hex.hash()]
    }
    return result
  }

  private getVisibleGroups(hexes: Hex[]): Group[] {
    let result: Group[] = []
    for (let hex of hexes) {
      for (let group of this.world.groups) {
        if (group.pos.equals(hex)) result.push(group)
      }
    }
    return result
  }
  private getVisibleBattles(hexes: Hex[]): Battle[] {
    let result: Battle[] = []
    for (let hex of hexes) {
      for (let battle of this.world.battles) {
        if (battle.pos.equals(hex)) result.push(battle)
      }
    }
    return result
  }

  private getVisibleBuildings(hexes: Hex[]): Building[] {
    let result: Building[] = []
    for (let hex of hexes) {
      for (let building of this.world.buildings) {
        if (building.pos.equals(hex)) result.push(building)
      }
    }
    return result
  }

  /**
   * Checks if a player can build a building at a tile
   * @param tile Tile
   * @param uid Player uid
   * @param name of building
   */
  private isAllowedToBuild(tile: Tile, uid: string, type: string): boolean {
    let object = Rules.buildings[type]

    return (
      this.hasResources(tile, object.levels[0].cost) &&
      this.hasPresence(tile.hex, uid)
    )
  }

  /**
   * Returns true if uid has group at pos
   * @param pos
   * @param uid
   */
  private hasGroupAt(pos: Hex, uid: string): boolean {
    for (let group of this.world.groups) {
      if (group.pos.equals(pos) && group.owner === uid) {
        return true
      }
    }
    return false
  }

  /**
   * Returns true if uid has building at pos
   * @param pos
   * @param uid
   */
  private hasBuildingAt(pos: Hex, uid: string): boolean {
    for (let building of this.world.buildings) {
      if (building.pos.equals(pos) && building.owner === uid) {
        return true
      }
    }
    return false
  }

  /**
   * Returns true if uid has group or building at pos
   * @param pos
   * @param uid
   */
  private hasPresence(pos: Hex, uid: string): boolean {
    return this.hasGroupAt(pos, uid) || this.hasBuildingAt(pos, uid)
  }

  /**
   * Checks if the object (building or unit) can be created on tile
   * @param tile
   * @param object
   */
  private hasResources(tile: Tile, cost: any): boolean {
    for (let resource of Object.keys(cost)) {
      if (
        !tile.resources[resource] ||
        tile.resources[resource] < cost[resource]
      ) {
        return false
      }
    }
    return true
  }

  private getRandomHex(): Hex {
    let hashes = Object.keys(this.world.tiles)
    let index = Math.round(Math.random() * hashes.length)
    return this.world.tiles[hashes[index]].hex
  }

  public setWorld(world: World) {
    this.world = world
  }
}
