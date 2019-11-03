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
import {astar} from "../../../shared/pathfinding";
import Vector2 from "../../../shared/vector2";
import Vector3 from "../../../shared/vector3";
import { Socket } from "socket.io";
import { Hashtable } from "../../../shared/util";
import Tile, { Spot } from "./tile";
import World from "./world";
import Unit from "./objects/unit";
import Hex from "../../../shared/hex";
import Building from "./objects/building";
import { EnumUnit, PlayerRelation, EnumRelationType } from "../../../shared/gamedata";
import Mapgen from "./mapgen";

export default class GameServer {
  
  private io: socketio.Server;

  private socketplayer: {} = {};
  private uidsockets: {} = {};
  private players: Player[] = [];

  private world:World;
  
  //#region Gameloop Variables
  private readonly delta = Math.round(1000 / config.updaterate);
  private readonly defaultDelta = Math.round(1000 / 60);
  private readonly netrate = Math.round(1000 / config.netrate);
  private readonly defaultNetrate = Math.round(1000 / 30);
  private isRunning = false;
  private lastTime = Date.now();
  private accumulator = 0;
  private timeSinceLastUpdate = 0;
  //#endregion

  constructor(world:World) {
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

  run() {
    this.isRunning = true;
    let gameloop = () => {
      let newTime = Date.now();
      let frameTime = newTime - this.lastTime;

      this.lastTime = newTime;

      this.timeSinceLastUpdate += frameTime;
      this.accumulator += frameTime;

      while (this.accumulator > this.delta) {
        this.update(this.delta / this.defaultDelta);
        this.accumulator -= this.delta;
      }

      if (this.timeSinceLastUpdate > this.netrate) {
        this.updateNet(this.timeSinceLastUpdate / this.defaultNetrate);
        this.timeSinceLastUpdate = 0;
      }

      if (this.isRunning) {
        setImmediate(gameloop);
      }
    }
    gameloop();
  }

  pause() {
    Log.info("Game paused");
    this.isRunning = false;
  }

  resume() {
    Log.info("Game resumed");
    this.lastTime = Date.now(); //lastTime zurücksetzen, damit die pausierte Zeit nicht nachgeholt wird
    this.run();
  }

  //Loops
  update(deltaFactor) {
    for (let i = 0; i < this.world.units.length; i++) {
      const unit:Unit = this.world.units[i];
      if(unit.targetHexes.length > 0) {
        let currentTile = this.world.tiles[unit.pos.hash()]
        unit.movementStatus += (unit.speed*currentTile.movementFactor*deltaFactor*0.1); //TODO calculate correct movementcost
        if(unit.movementStatus > 100) {
          currentTile.removeSpot(unit.id);
          unit.pos = unit.targetHexes.splice(0,1)[0];
          this.world.tiles[unit.pos.hash()].addSpot(unit.getSprite(), unit.id);
          unit.movementStatus = 0;
        }
      }    
    }

    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i];
      if (player.initialized) {
        //TODO
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
          socket.emit("gamestate world", this.world);
        }
      }
    }
  }

  onPlayerDisconnected(socket: Socket) {
    const player: Player = this.socketplayer[socket.id];
    if(player) {
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
          let initialUnit = Unit.createUnit(player.uid,EnumUnit.SCOUT,new Hex(0,0,0));
          self.world.units.push(initialUnit);

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
      for(let i = 0; i < self.players.length; i++) {
        if(self.players[i].uid === uid) {
          this.socketplayer[socket.id] = self.players[i];
          Log.info("Old Player Connected: " + self.players[i].name);
        } 
      }
    }
    this.uidsockets[uid] = socket;

    //Send initial data
    socket.emit("gamestate world", this.world);
  }

  onRequestMovement(socket: Socket, hex:any) {
    let uid = this.getPlayerUid(socket.id);
    for(let unit of this.world.units) {
      if(uid === unit.owner) {
        unit.targetHexes = astar(this.world.tiles, unit.pos, new Hex(hex.q, hex.r, hex.s));
        for(let hex of unit.targetHexes) {
          console.log("Hex: "+hex + "Factor: "+this.world.tiles[hex.hash()].movementFactor);
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
    if(!playerRelation) {
      playerRelation = new PlayerRelation(data.id1, data.id2, EnumRelationType.rtNeutral);
      this.world.playerRelations[hash] = playerRelation;
    }
    socket.emit("gamestate relation", playerRelation);

  }

  private getPlayerUid(socketId) {
    const player:Player = this.getPlayer(socketId);
    if(player) {
      return player.uid;
    }
    return null;
  }

  private getPlayer(socketId:string):Player {
    return this.socketplayer[socketId];
  }

  public setWorld(world: World) {
    this.world = world;
  }
};
