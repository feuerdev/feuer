import Player from "../../shared/player"

import Log from "./util/log"
import * as Rules from "../../shared/rules.json"
import { astar } from "../../shared/pathfinding"
import { Socket } from "socket.io"
import { Hashtable } from "../../shared/util"
import Hex from "../../shared/hex"
import * as Hexes from "../../shared/hex"
import Config from "./util/environment"
import { Building, Group, World, Tile } from "../../shared/objects"
import * as PlayerRelation from "../../shared/relation"
import { Battle } from "../../shared/objects"
import * as Battles from "./battle"
import { createGroup } from "./group"
import { createBuilding, upgradeBuilding } from "./building"
import { EnumRelationType } from "../../shared/relation"

export default class GameServer {
  private socketplayer: {} = {}
  private uidsockets: {} = {}

  private world: World

  //#region Gameloop Variables
  private readonly updaterate = Math.round(1000 / Config.updateRate)
  private readonly defaultDelta = Math.round(1000 / Config.referenceRate)
  //#endregion

  constructor(world: World) {
    this.world = world
  }

  //Gameloop
  private previousTick = Date.now()
  private actualTicks = 0
  run() {
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

  resume() {
    Log.info("Game resumed")
    this.run()
  }

  //Loops
  update(deltaFactor: number) {
    //Group Movement
    Object.values(this.world.groups).forEach((group) => {
      if (group.targetHexes.length > 0) {
        const currentTile = this.world.tiles[Hexes.hash(group.pos)]
        const nextHex = group.targetHexes[0]

        if (!nextHex || !currentTile) return

        const nextTile = this.world.tiles[Hexes.hash(nextHex)]

        if (!nextTile) return

        group.movementStatus +=
          calculateMovementProgress(group, currentTile, nextTile) * deltaFactor
        if (group.movementStatus > 100) {
          group.pos = group.targetHexes.splice(0, 1)[0]!
          group.movementStatus = 0
          this.updatePlayerVisibilities(group.owner)
          this.checkForBattle(group)
        }
      }
    })

    //Resource Gathering
    for (let building of this.world.buildings) {
      let tile = this.world.tiles[Hexes.hash(building.position)]
      for (let res of Object.keys(building.resourceGeneration)) {
        tile.resources[res] += building.resourceGeneration[res] * deltaFactor
      }
    }

    //Battles
    let i = this.world.battles.length
    while (i--) {
      // let battle = this.world.battles[i]!
      // battle.defender.hp -= battle.attacker.attack + Math.round(Math.random() * 10)
      // battle.attacker.hp -= battle.defender.attack + Math.round(Math.random() * 20)
      // if (battle.attacker.hp <= 0 || battle.defender.hp <= 0) {
      //   if (battle.attacker.hp <= 0) {
      //     delete this.world.groups[battle.attacker.id]
      //     this.updatePlayerVisibilities(battle.attacker.owner)
      //   }
      //   if (battle.defender.hp <= 0) {
      //     delete this.world.groups[battle.defender.id]
      //     this.updatePlayerVisibilities(battle.defender.owner)
      //   }
      //   this.world.battles.splice(i, 1)
      // }
    }
  }

  checkForBattle(group: Group) {
    Object.values(this.world.groups).forEach((otherGroup) => {
      if (
        Hexes.equals(group.pos, otherGroup.pos) &&
        group.owner !== otherGroup.owner &&
        group.id !== otherGroup.id
      ) {
        if (
          this.world.playerRelations[
            PlayerRelation.hash(group.owner, otherGroup.owner)
          ].relationType === PlayerRelation.EnumRelationType.hostile
        ) {
          this.world.battles.push(
            Battles.create(++this.world.idCounter, group.pos, group, otherGroup)
          )
        }
      }
    })
  }

  updateNet(_delta) {
    for (let player of Object.values(this.world.players)) {
      if (player.initialized) {
        const socket: Socket = this.uidsockets[player.uid]
        if (socket && socket.connected) {
          let groups = this.getVisibleGroups(player.visibleHexes)
          let battles = this.getVisibleBattles(player.visibleHexes)
          let buildings = this.getVisibleBuildings(player.visibleHexes)
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
      Log.info("Player Disconnected: " + player.uid)
    }
  }

  /*
   * Check if if the uid is already known by the server.
   * If not, create a new player instance and link the uid to the socket.
   * If the uid is known, link the socket to the player instance.
   */
  async onPlayerInitialize(socket: Socket, uid: string) {
    let player = this.world.players[uid]
    if (!player) {
      player = new Player()
      player.uid = uid
      player.initialized = true

      Log.info("New Player Connected: " + player.uid)

      //Give Player an initial Scout and Camp
      let pos = this.getRandomHex()
      let initialGroup = createGroup(
        ++this.world.idCounter,
        player.uid,
        "Scout",
        pos
      )
      this.world.groups[initialGroup.id] = initialGroup

      // let initialCamp = createBuilding(player.uid, "Town Hall", pos)
      // Building.updateBuilding(initialCamp);
      // this.world.buildings.push(initialCamp)

      //Register player in Gamesever
      this.world.players[uid] = player
      this.updatePlayerVisibilities(uid)
    } else {
      Log.info(`Player reconnected: ${player.uid}`)
      socket.emit("gamestate tiles", this.getTiles(player.discoveredHexes))
    }

    //Register player in Gamesever
    this.socketplayer[socket.id] = player
    this.uidsockets[uid] = socket
  }

  onRequestTiles(socket: Socket, data: Hex[]) {
    const player: Player = this.socketplayer[socket.id]
    if (player) {
      //TODO: Check if player has permission to see these tiles
      socket.emit("gamestate tiles", this.getTiles(data))
    }
  }

  onRequestMovement(socket: Socket, data: any) {
    let uid = this.getPlayerUid(socket.id)
    let selection: number = data.selection
    let target = Hexes.create(data.target.q, data.target.r, data.target.s)
    const group = this.world.groups[selection]
    if (uid === group.owner) {
      if (this.world.tiles[Hexes.hash(target)]) {
        group.movementStatus = 0
        group.targetHexes = astar(this.world.tiles, group.pos, target)
        return
      }
    }
  }

  onRequestConstruction(socket: Socket, data) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) {
      return
    }

    let pos = Hexes.create(data.pos.q, data.pos.r, data.pos.s)
    let tile = this.world.tiles[Hexes.hash(pos)]

    if (this.isAllowedToBuild(tile, uid, data.type)) {
      let building = createBuilding(++this.world.idCounter, uid, data.type, pos)
      this.world.buildings.push(building)
      this.updatePlayerVisibilities(uid)
    }
  }

  onRequestRelation(socket: Socket, data) {
    let hash = PlayerRelation.hash(data.id1, data.id2)
    let playerRelation = this.world.playerRelations[hash]
    if (!playerRelation) {
      playerRelation = PlayerRelation.create(
        data.id1,
        data.id2,
        EnumRelationType.hostile
      )
      this.world.playerRelations[hash] = playerRelation
    }
    socket.emit("gamestate relation", playerRelation)
  }

  onRequestUnitAdd(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    const group = this.world.groups[data.groupId]

    if (group.owner !== uid) {
      Log.warn(`Player '${uid}' tried to add unit to group he doesn't own`)
      return
    }

    let unit = this.world.units.find((unit) => {
      return unit.id === data.unitId
    })
    if (group && unit) {
      group.units.push(unit)
    }
  }
  onRequestUnitRemove(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)

    const group = this.world.groups[data.groupId]
    if (group.owner !== uid) {
      Log.warn(`Player '${uid}' tried to remove unit to group he doesn't own`)
      return
    }

    if (group) {
      let unit = group.units.find((unit) => {
        return unit.id === data.unitId
      })
      if (unit) {
        group.units.splice(group.units.indexOf(unit), 1)
      }
    }
  }
  onRequestTransfer(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    const group = this.world.groups[data.groupId]
    if (group.owner !== uid) {
      Log.warn(
        `Player '${uid}' tried to transfer resources to group he doesn't own`
      )
      return
    }

    if (group) {
      let tile = this.world.tiles[Hexes.hash(group.pos)]
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
    const uid = this.getPlayerUid(socket.id)
    if (!uid) {
      return
    }
    let buildingToDemolish = this.world.buildings.find((building) => {
      return building.id === data.buildingId && building.owner === uid
    })
    if (buildingToDemolish) {
      this.world.buildings.splice(
        this.world.buildings.indexOf(buildingToDemolish),
        1
      )
      this.updatePlayerVisibilities(uid)
    }
  }

  onRequestUpgrade(socket: Socket, data) {
    const uid = this.getPlayerUid(socket.id)
    if (!uid) {
      return
    }
    let buildingToUpgrade = this.world.buildings.find((building) => {
      return building.id === data.buildingId && building.owner === uid
    })
    if (buildingToUpgrade) {
      //TODO: Check if has enogh money here and reduct money
      upgradeBuilding(buildingToUpgrade)
      this.updatePlayerVisibilities(uid)
    }
  }

  onRequestDisband(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id)
    const groupToDisband = this.world.groups[data.groupId]
    if (groupToDisband.owner !== uid) {
      Log.warn(`Player '${uid}' tried to disband unit to group he doesn't own`)
      return
    }

    if (groupToDisband) {
      delete this.world.groups[groupToDisband.id]
      this.updatePlayerVisibilities(uid)
    }
  }

  private getPlayerUid(socketId): string | null {
    const player: Player = this.getPlayerBySocketId(socketId)
    if (player) {
      return player.uid
    }
    return null
  }

  private getPlayerBySocketId(socketId: string): Player {
    return this.socketplayer[socketId]
  }

  private getPlayerByUid(uid: string): Player | null {
    return this.world.players[uid]
  }

  /**
   * Updates the player.discoveredHexes and player.visibleHexes. Call this method after something happens, that affects visibilities (movement, upgrades, deaths...)
   * @param uid player id
   */
  private updatePlayerVisibilities(uid: string) {
    const player = this.getPlayerByUid(uid)
    if (!player) {
      return
    }
    player.visibleHexes = []

    if (player) {
      Object.values(this.world.groups).forEach((group) => {
        if (group.owner === uid) {
          let visible = Hexes.neighborsRange(group.pos, group.spotting)
          this.addUniqueHexes(player.visibleHexes, visible)
          this.addUniqueHexes(player.discoveredHexes, visible)
        }
      })
      for (let building of this.world.buildings) {
        if (building.owner === uid) {
          let visible = Hexes.neighborsRange(
            building.position,
            building.spotting
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
        if (Hexes.equals(nHex, h)) {
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
      result[Hexes.hash(hex)] = this.world.tiles[Hexes.hash(hex)]
    }
    return result
  }

  private getVisibleGroups(hexes: Hex[]): Hashtable<Group> {
    let result: Hashtable<Group> = {}
    for (let hex of hexes) {
      Object.values(this.world.groups).forEach((group) => {
        if (Hexes.equals(group.pos, hex)) result[group.id] = group
      })
    }
    return result
  }
  private getVisibleBattles(hexes: Hex[]): Battle[] {
    let result: Battle[] = []
    for (let hex of hexes) {
      for (let battle of this.world.battles) {
        if (Hexes.equals(battle.position, hex)) result.push(battle)
      }
    }
    return result
  }

  private getVisibleBuildings(hexes: Hex[]): Building[] {
    let result: Building[] = []
    for (let hex of hexes) {
      for (let building of this.world.buildings) {
        if (Hexes.equals(building.position, hex)) result.push(building)
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
    let found = false
    Object.values(this.world.groups).forEach((group) => {
      if (Hexes.equals(group.pos, pos) && group.owner === uid) {
        found = true
      }
    })
    return found
  }

  /**
   * Returns true if uid has building at pos
   * @param pos
   * @param uid
   */
  private hasBuildingAt(pos: Hex, uid: string): boolean {
    for (let building of this.world.buildings) {
      if (Hexes.equals(building.position, pos) && building.owner === uid) {
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
    this.updateNet(1)
  }
}

function calculateMovementProgress(
  _group: Group,
  _currentTile: Tile,
  _nextTile: Tile
) {
  //TODO: calculate
  return 100
}
// public updateMovementFactor() {
//   //TODO calculate correct movementcost
//   let movementFactor = 1

//   if (this.height >= Rules.settings.map_level_stone) {
//     movementFactor -= 0.3 //Its cold
//   }

//   if (this.forestation > 0.7) {
//     movementFactor -= 0.4 //You're in a forest
//   }

//   if (this.height < Rules.settings.map_level_water_deep) {
//     movementFactor = 0.01 //You're now swimming
//   } else if (this.height < Rules.settings.map_level_water_shallow) {
//     movementFactor = 0.1 //You're wading
//   }

//   // movementFactor -= this.environmentSpots.length*0.05;

//   this.movementFactor = Math.min(1, Math.max(0.01, movementFactor))
// }
