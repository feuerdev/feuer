/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */

import * as socketio from "socket.io";
import { Server } from "http";

import Player from "./player";
import Helper from "../helper";

import * as db from "../util/db";
import Log from "../util/log";
import config from "../util/config";
import * as Rules from "../../../shared/rules.json";
import { astar } from "../../../shared/pathfinding";
import { Socket } from "socket.io";
import { Hashtable } from "../../../shared/util";
import Tile, { Spot } from "./tile";
import World from "./world";
import Army from "./objects/army";
import Hex from "../../../shared/hex";
import Building from "./objects/building";
import { PlayerRelation, EnumRelationType } from "../../../shared/gamedata";
import Battle from "./objects/battle";

export default class GameServer {

  private io: socketio.Server;

  private socketplayer: {} = {};
  private uidsockets: {} = {};
  private players: Player[] = [];

  private world: World;

  //#region Gameloop Variables
  private readonly updaterate = Math.round(1000 / config.updaterate);
  private readonly defaultDelta = Math.round(1000 / 60);
  private readonly netrate = Math.round(1000 / config.netrate);
  private readonly defaultNetrate = Math.round(1000 / 30);
  private isRunning = false;
  //#endregion

  constructor(world: World) {
    this.world = world;
  }

  listen(httpServer: Server) {
    this.io = socketio(httpServer, { transports: config.transports });
    this.io.on("connection", (socket) => {
      socket.on("initialize", (data) => this.onPlayerInitialize(socket, data));
      socket.on("disconnect", () => this.onPlayerDisconnected(socket));

      socket.on("request movement", (data) => this.onRequestMovement(socket, data));
      socket.on("request construction", (data) => this.onRequestConstruction(socket, data));
      socket.on("request unit", (data) => this.onRequestUnit(socket, data));
      socket.on("request relation", (data) => this.onRequestRelation(socket, data));
    });
  }

  //Gameloop
  private previousTick = Date.now();
  private actualTicks = 0
  run() {
    this.isRunning = true;

    let gameloop = () => {
      let timeSincelastFrame = Date.now() - this.previousTick;
      this.previousTick = Date.now();
      this.actualTicks++;
      let dbgStart = Date.now();
      this.update(this.updaterate / this.defaultDelta);
      let dbgAfterUpdate = Date.now();
      this.updateNet(this.updaterate / this.defaultNetrate);
      let dbgAfterSend = Date.now();
      if (this.actualTicks > 5 && Math.abs(timeSincelastFrame - this.updaterate) > 30) {
        Log.error("Warning something is fucky with the gameloop");
      }
      Log.silly("Update took:"+ (dbgAfterUpdate - dbgStart)+ " Sending Data to clients took:"+ (dbgAfterSend - dbgAfterUpdate)+ " Time since last Frame:"+ timeSincelastFrame+ " Gesamtticks:"+ this.actualTicks+ " Abweichung:"+ (timeSincelastFrame - this.updaterate));

    }
    setInterval(gameloop, this.updaterate);
  }

  pause() {
    Log.info("Game paused");
    this.isRunning = false;
  }

  resume() {
    Log.info("Game resumed");
    this.run();
  }

  //Loops
  update(deltaFactor) {

    //Army Movement
    for (let i = 0; i < this.world.armies.length; i++) {
      const army: Army = this.world.armies[i];
      if (army.targetHexes.length > 0) {
        let currentTile = this.world.tiles[army.pos.hash()]
        army.movementStatus += (army.speed * currentTile.movementFactor * deltaFactor * 0.1); //TODO calculate correct movementcost
        if (army.movementStatus > 100) { //Movement!
          currentTile.removeSpot(army.id);
          army.pos = army.targetHexes.splice(0, 1)[0];
          this.world.tiles[army.pos.hash()].addSpot(army.getSprite(), army.id);
          army.movementStatus = 0;
          this.updatePlayerVisibilities(army.owner);
          this.checkForBattle(army);
        }
      }
    }

    //Resource Gathering
    for (let building of this.world.buildings) {
      let tile = this.world.tiles[building.pos.hash()];
      for(let res of Object.keys(building.resourceGeneration)) {
        if(!tile.resources[res]) {
          tile.resources[res] = 0;
        }
        tile.resources[res] += building.resourceGeneration[res] * deltaFactor;
      }
    }

    //Battles
    let i = this.world.battles.length;
    while (i--) {
      let battle = this.world.battles[i];

      battle.aDefender.hp -= battle.aAttacker.attack + Math.round(Math.random() *10);
      battle.aAttacker.hp -= battle.aDefender.attack + Math.round(Math.random() *20);

      if (battle.aAttacker.hp <= 0 || battle.aDefender.hp <= 0) {
        if (battle.aAttacker.hp <= 0) {
          this.world.tiles[battle.pos.hash()].removeSpot(battle.aAttacker.id);
          this.world.armies.splice(this.world.armies.indexOf(battle.aAttacker), 1);
          this.updatePlayerVisibilities(battle.aAttacker.owner);
        }
        if (battle.aDefender.hp <= 0) {
          this.world.tiles[battle.pos.hash()].removeSpot(battle.aDefender.id);
          this.world.armies.splice(this.world.armies.indexOf(battle.aDefender), 1);
          this.updatePlayerVisibilities(battle.aDefender.owner);
        }
        this.world.battles.splice(i, 1);
      }
    }

    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      if (player.initialized) {
        //TODO
      }
    }
  }

  checkForBattle(army: Army) {
    for (let other_army of this.world.armies) {
      if (other_army.pos.equals(army.pos) && army.owner !== other_army.owner && army.id !== other_army.id) {
        if(this.world.playerRelations[PlayerRelation.getHash(army.owner, other_army.owner)].relationType === EnumRelationType.rtHostile) {
          this.world.battles.push(new Battle(army.pos, army, other_army));
        }
      }
    }
  }

  updateKillStatistic(killer: Player, killed: Player): any {
    db.queryWithValues("INSERT INTO kills (killer, killed) VALUES (?, ?)", [killer.uid, killed.uid], function (error, results, fields) {
      if (error) {
        console.log(error);
      } else {
        console.log("updated kill db");
      }
    });
  }

  updateNet(delta) {
    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      if (player.initialized) {
        const socket: Socket = this.uidsockets[player.uid];
        if (socket) {
          socket.emit("gamestate players", this.players);
          let tiles = this.getTiles(player.visibleHexes);
          let armies = this.getVisibleArmies(player.visibleHexes);
          let battles = this.getVisibleBattles(player.visibleHexes);
          let buildings = this.getVisibleBuildings(player.visibleHexes);
          socket.emit("gamestate tiles", tiles);
          socket.emit("gamestate armies", armies);
          socket.emit("gamestate battles", battles);
          socket.emit("gamestate buildings", buildings);
        }
      }
    }
  }

  onPlayerDisconnected(socket: Socket) {
    const player: Player = this.socketplayer[socket.id];
    if (player) {
      Log.info("Player Disconnected: " + player.name);
    }
  }
  onPlayerInitialize(socket: Socket, uid: string) {
    const self = this;
    if (!this.uidsockets[uid]) {
      Helper.getUsername(uid)
        .then((name) => {
          //Create new Player
          const player: Player = new Player();
          player.uid = uid;
          player.name = name;
          player.initialized = true;

          //Give Player an initial Scout and Camp
          let pos = self.getRandomHex();
          let initialUnit = Army.createUnit(player.uid, "Scout", pos);
          self.world.armies.push(initialUnit);

          let initialCamp = Building.createBuilding(player.uid, "Campsite", pos);
          self.world.buildings.push(initialCamp);

          //Prepare Drawing of that unit
          self.world.tiles[initialUnit.pos.hash()].addSpot(initialUnit.getSprite(), initialUnit.id);
          self.world.tiles[initialCamp.pos.hash()].addSpot(initialCamp.getSprite(), initialCamp.id);

          //Register player in Gamesever
          self.players.push(player);
          self.socketplayer[socket.id] = player;
          Log.info("New Player Connected: " + player.name);

          this.updatePlayerVisibilities(uid);
        })
        .catch(error => {
          Log.error(error);
        });
    } else {
      for (let i = 0; i < self.players.length; i++) {
        if (self.players[i].uid === uid) {
          this.socketplayer[socket.id] = self.players[i];
          Log.info("Old Player Connected: " + self.players[i].name);

          socket.emit("gamestate discovered tiles", this.getTiles(self.players[i].discoveredHexes));
        }
      }
    }
    this.uidsockets[uid] = socket;
  }

  onRequestMovement(socket: Socket, data: any) {
    let uid = this.getPlayerUid(socket.id);
    let selection:number[] = data.selection;
    let target:Hex = new Hex(data.target.q, data.target.r, data.target.s);
    for (let unit of this.world.armies) {
      if (uid === unit.owner && selection.includes(unit.id) ) {
        if(this.world.tiles[target.hash()]) {
          unit.targetHexes = astar(this.world.tiles, unit.pos, target);
          for (let hex of unit.targetHexes) {
            console.log("Hex: " + JSON.stringify(hex) + "Factor: " + this.world.tiles[hex.hash()].movementFactor);
          }
        }
      }
    }
  }

  onRequestConstruction(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id);
    let pos = new Hex(data.pos.q, data.pos.r, data.pos.s);
    let tile = this.world.tiles[pos.hash()];

    if(this.isAllowedToBuild(tile, uid, data.name)) {
      let building = Building.createBuilding(uid, data.name, pos);
      this.world.buildings.push(building);
      tile.addSpot(building.sprite, building.id);
      this.updatePlayerVisibilities(uid);
    }
  }

  onRequestUnit(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id);
    let pos = new Hex(data.pos.q, data.pos.r, data.pos.s);
    let tile = this.world.tiles[pos.hash()];
    if(this.isAllowedToRecruit(tile, uid, data.name)) {
      let army = Army.createUnit(uid, data.name, pos);
      this.world.armies.push(army);
      tile.addSpot(army.getSprite(), army.id);
      this.updatePlayerVisibilities(uid);
    }
  }

  onRequestRelation(socket: Socket, data) {
    let hash = PlayerRelation.getHash(data.id1, data.id2);
    let playerRelation = this.world.playerRelations[hash];
    if (!playerRelation) {
      playerRelation = new PlayerRelation(data.id1, data.id2, EnumRelationType.rtHostile);
      this.world.playerRelations[hash] = playerRelation;
    }
    socket.emit("gamestate relation", playerRelation);

  }

  private getPlayerUid(socketId):string {
    const player: Player = this.getPlayerBySocketId(socketId);
    if (player) {
      return player.uid;
    }
    return null;
  }

  private getPlayerBySocketId(socketId: string): Player {
    return this.socketplayer[socketId];
  }

  private getPlayerByUid(uid: string): Player {
    for(let player of this.players) {
      if(player.uid === uid) return player;
    }
    return null;
  }

  /**
   * Updates the player.discoveredHexes and player.visibleHexes. Call this method after something happens, that affects visibilities (movement, upgrades, deaths...)
   * @param uid player id
   */
  private updatePlayerVisibilities(uid:string) {
    let player:Player = this.getPlayerByUid(uid);
    player.visibleHexes = [];

    if(player) {
      for(let army of this.world.armies) {
        if(army.owner === uid) {
          let visible:Hex[] = army.pos.neighborsRange(army.getSpottingRange());
          this.addUniqueHexes(player.visibleHexes, visible);
          this.addUniqueHexes(player.discoveredHexes, visible);
        }
      }
      for(let building of this.world.buildings) {
        if(building.owner === uid) {
          this.addUniqueHexes(player.visibleHexes, [building.pos]);
          this.addUniqueHexes(player.discoveredHexes, [building.pos]);
        }
      }
    }    
  }

  private addUniqueHexes(hexarray:Hex[], newHexes:Hex[]) {
    for(let nHex of newHexes) {
      let found = false;
      for(let h of hexarray) {
        if(nHex.equals(h)) {
          found = true;
        }
      }
      if(!found) {
        hexarray.push(nHex);
      }
    }    
  }

  private getTiles(hexes:Hex[]):Hashtable<Tile> {
    let result:Hashtable<Tile> = {};
    for(let hex of hexes) {
      result[hex.hash()] = this.world.tiles[hex.hash()];
    }
    return result;
  }

  private getVisibleArmies(hexes:Hex[]):Army[] {
    let result:Army[] = [];
    for(let hex of hexes) {
      for(let army of this.world.armies) {
        if(army.pos.equals(hex)) result.push(army);
      }
    }
    return result;
  }
  private getVisibleBattles(hexes:Hex[]):Battle[] {
    let result:Battle[] = [];
    for(let hex of hexes) {
      for(let battle of this.world.battles) {
        if(battle.pos.equals(hex)) result.push(battle);
      }
    }
    return result;
  }

  private getVisibleBuildings(hexes:Hex[]):Building[] {
    let result:Building[] = [];
    for(let hex of hexes) {
      for(let building of this.world.buildings) {
        if(building.pos.equals(hex)) result.push(building);
      }
    }
    return result;
  }

  /**
   * Checks if a player can build a building at a tile
   * @param tile Tile
   * @param uid Player uid
   * @param name of building
   */
  private isAllowedToBuild(tile:Tile, uid:string, name:string):boolean{
    let object = Rules.buildings[name];
    return this.hasResources(tile, object) && this.hasPresence(tile.hex, uid);
  }

  /**
   * Checks if a player can recruit an army at a tile
   * @param tile Tile
   * @param uid Player uid
   * @param name of unit
   */
  private isAllowedToRecruit(tile:Tile, uid:string, name:string):boolean{
    let object = Rules.units[name];
    return this.hasResources(tile, object) && this.hasBuildingAt(tile.hex, uid);
  }

  /**
   * Returns true if uid has army at pos
   * @param pos 
   * @param uid 
   */
  private hasArmyAt(pos:Hex, uid:string):boolean {
    for(let army of this.world.armies) {
      if(army.pos.equals(pos) && army.owner === uid) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns true if uid has building at pos
   * @param pos 
   * @param uid 
   */
  private hasBuildingAt(pos:Hex, uid:string):boolean {
    for(let building of this.world.buildings) {
      if(building.pos.equals(pos) && building.owner === uid) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns true if uid has army or building at pos
   * @param pos 
   * @param uid 
   */
  private hasPresence(pos:Hex, uid:string):boolean {
    return this.hasArmyAt(pos, uid) || this.hasBuildingAt(pos, uid);
  }

  /**
   * Checks if the object (building or unit) can be created on tile
   * @param tile 
   * @param object 
   */
  private hasResources(tile:Tile, object:any):boolean {
    for(let resource of Object.keys(object.cost)) {
      if(!tile.resources[resource] || tile.resources[resource] < object.cost[resource]) {
        return false;
      }
    }
    return true;
  }

  private getRandomHex():Hex {
    let hashes = Object.keys(this.world.tiles);
    let index = Math.round(Math.random()*hashes.length);
    return this.world.tiles[hashes[index]].hex;    
  }

  public setWorld(world: World) {
    this.world = world;
  }
};
