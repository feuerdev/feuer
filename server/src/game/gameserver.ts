/**
 * Einstiegspunkt für den Gameserver Code
 * Created by geller on 30.08.2016.
 */

import * as socketio from "socket.io";
import { Server } from "http";

import Player from "./player";
import Helper from "../helper";

import * as db from "../util/db";
import * as Util from "../../../shared/util";
import Log from "../util/log";
import config from "../util/config";
import { astar } from "../../../shared/pathfinding";
import Vector2 from "../../../shared/vector2";
import Vector3 from "../../../shared/vector3";
import { Socket } from "socket.io";
import { Hashtable } from "../../../shared/util";
import Tile, { Spot } from "./tile";
import World from "./world";
import Army from "./objects/army";
import Hex from "../../../shared/hex";
import Building from "./objects/building";
import { EnumUnit, PlayerRelation, EnumRelationType } from "../../../shared/gamedata";
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
    //
  }

  listen(httpServer: Server) {
    this.io = socketio(httpServer, { transports: config.transports });
    this.io.on("connection", (socket) => {
      socket.on("initialize", (data) => this.onPlayerInitialize(socket, data));
      socket.on("disconnect", () => this.onPlayerDisconnected(socket));

      socket.on("request movement", (data) => this.onRequestMovement(socket, data));
      socket.on("request construction", (data) => this.onRequestConstruction(socket, data));
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
      //this.previousTick = Date.now();
      this.actualTicks++;
      let dbgStart = Date.now();
      this.update(this.updaterate / this.defaultDelta);
      let dbgAfterUpdate = Date.now();
      this.updateNet(this.updaterate / this.defaultNetrate);
      let dbgAfterSend = Date.now();
      if (this.actualTicks > 5 && Math.abs(timeSincelastFrame - this.updaterate) > 10) {
        Log.error("Warning something is fucky with the gameloop");
      }
      Log.silly("Update took:", dbgAfterUpdate - dbgStart, "Sending Data to clients took:", dbgAfterSend - dbgAfterUpdate, "Time since last Frame:", timeSincelastFrame, "Gesamtticks:", this.actualTicks, "Abweichung:", timeSincelastFrame - this.updaterate);

    }
    setInterval(gameloop, this.updaterate);
  }

  pause() {
    Log.info("Game paused");
    this.isRunning = false;
  }

  resume() {
    Log.info("Game resumed");
    //this.lastTime = Date.now(); //lastTime zurücksetzen, damit die pausierte Zeit nicht nachgeholt wird
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

          this.checkForBattle(army);
        }
      }
    }

    //Resource Gathering
    for (let building of this.world.buildings) {
      let tile = this.world.tiles[building.pos.hash()];
      tile.food += building.foodHarvest * deltaFactor;
      tile.wood += building.woodHarvest * deltaFactor;
      tile.stone += building.stoneHarvest * deltaFactor;
      tile.iron += building.ironHarvest * deltaFactor;
      tile.gold += building.goldHarvest * deltaFactor;
    }

    //Battles
    let i = this.world.battles.length;
    while (i--) {
      let battle = this.world.battles[i];

      battle.aDefender.health -= battle.aAttacker.attack + Math.round(Math.random() *10);
      battle.aAttacker.health -= battle.aDefender.attack + Math.round(Math.random() *20);

      if (battle.aAttacker.health <= 0 || battle.aDefender.health <= 0) {
        if (battle.aAttacker.health <= 0) {
          this.world.tiles[battle.pos.hash()].removeSpot(battle.aAttacker.id);
          this.world.armies.splice(this.world.armies.indexOf(battle.aAttacker));
        }
        if (battle.aDefender.health <= 0) {
          this.world.tiles[battle.pos.hash()].removeSpot(battle.aDefender.id);
          this.world.armies.splice(this.world.armies.indexOf(battle.aDefender));
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
      if (other_army.pos.equals(army.pos) && army.id !== other_army.id) { //TODO: Check for allie status, stances etc
        this.world.battles.push(new Battle(army.pos, army, other_army));
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
          socket.emit("gamestate world", this.world.prepareForSending());
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

          //Give Player an initial Scout
          let initialUnit = Army.createUnit(player.uid, EnumUnit.SCOUT, new Hex(0, 0, 0));
          self.world.armies.push(initialUnit);

          //Prepare Drawing of that unit
          self.world.tiles[initialUnit.pos.hash()].addSpot(initialUnit.getSprite(), initialUnit.id);

          //Register player in Gamesever
          self.players.push(player);
          self.socketplayer[socket.id] = player;
          Log.info("New Player Connected: " + player.name);
        })
        .catch(error => {
          Log.error(error);
        });
    } else {
      for (let i = 0; i < self.players.length; i++) {
        if (self.players[i].uid === uid) {
          this.socketplayer[socket.id] = self.players[i];
          Log.info("Old Player Connected: " + self.players[i].name);
        }
      }
    }
    this.uidsockets[uid] = socket;

    //Send initial data
    socket.emit("gamestate world", this.world);
  }

  onRequestMovement(socket: Socket, hex: any) {
    let uid = this.getPlayerUid(socket.id);
    for (let unit of this.world.armies) {
      if (uid === unit.owner) {
        unit.targetHexes = astar(this.world.tiles, unit.pos, new Hex(hex.q, hex.r, hex.s));
        for (let hex of unit.targetHexes) {
          console.log("Hex: " + JSON.stringify(hex) + "Factor: " + this.world.tiles[hex.hash()].movementFactor);
        }
      }
    }
  }

  onRequestConstruction(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id);
    let building = Building.createBuilding(uid, data.typeId, data.pos);
    //Todo: check if player is even allowed to do that
    this.world.buildings.push(building);
    let tile = this.world.tiles[new Hex(data.pos.q, data.pos.r, data.pos.s).hash()];
    tile.addSpot(building.sprite, building.id);
  }

  onRequestRelation(socket: Socket, data) {
    let hash = PlayerRelation.getHash(data.id1, data.id2);
    let playerRelation = this.world.playerRelations[hash];
    if (!playerRelation) {
      playerRelation = new PlayerRelation(data.id1, data.id2, EnumRelationType.rtNeutral);
      this.world.playerRelations[hash] = playerRelation;
    }
    socket.emit("gamestate relation", playerRelation);

  }

  private getPlayerUid(socketId) {
    const player: Player = this.getPlayer(socketId);
    if (player) {
      return player.uid;
    }
    return null;
  }

  private getPlayer(socketId: string): Player {
    return this.socketplayer[socketId];
  }

  public setWorld(world: World) {
    this.world = world;
  }
};
