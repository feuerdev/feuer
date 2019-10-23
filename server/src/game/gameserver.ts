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
import Vector2 from "../../../shared/vector2";
import Vector3 from "../../../shared/vector3";
import { Socket } from "socket.io";
import { Hashtable } from "../../../shared/util";
import Tile from "./tile";
import World from "./world";
import Unit from "./objects/unit";
import Hex from "../../../shared/hex";
import Building from "./objects/building";
import { EnumUnit } from "../../../shared/gamedata";

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
      if(unit.targetHex) {
        unit.movementStatus += unit.speed*deltaFactor*0.05;
        if(unit.movementStatus > 100) {
          unit.pos = unit.targetHex; //TODO:implement
          unit.targetHex = null;
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
          const player: Player = new Player();
          player.uid = uid;
          player.name = name;
          player.initialized = true;
          self.world.units.push(Unit.createUnit(player.uid,EnumUnit.SCOUT,new Hex(0,0,0)));
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

  onRequestMovement(socket: Socket, hex:Hex) {
    let uid = this.getPlayerUid(socket.id);
    for(let unit of this.world.units) {
      if(uid === unit.owner) {
        unit.targetHex = hex;
      }
    }
  }

  onRequestConstruction(socket: Socket, data) {
    let uid = this.getPlayerUid(socket.id);
    let building = Building.createBuilding(uid, data.typeId, data.pos);
    //Todo: check if player is even allowed to do that
    this.world.buildings.push(building);   
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
