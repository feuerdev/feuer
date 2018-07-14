/**
 * Created by Jannik on 04.09.2016.
 */
"use strict";
import * as io from "./lib/socket.io.min";
import Log from "./util/log";
import * as Util from "./util/util";

export interface ClientSocketDelegate {
    onConnected();
    onDisconnected();
    onMessage(topic:string)
};

export default class Connection {

    private ip: string;
    private transports: string[];

    private socket;

    private delegate: ClientSocketDelegate;

    /**
     * Constructor
     * @param ip Ip of the socket server
     * @param transports transport settings to init connection
     */
    constructor(ip, transports) {
        this.ip = ip;
        this.transports = transports;

        // this.onConnected = util.unassigned;
        // this.onDisconnected = util.unassigned;
        // this.onDataInit = util.unassigned;        
        // this.onDataNewUnit = util.unassigned;        
    }

    /**
     * Initiates the socket connecion
     */
    connect() {
        this.socket = io.connect(this.ip, {transports: this.transports});

        // this.socket.on("connect", this.delegate.onConnected);
        // this.socket.on("disconnect", this.delegate.onDisconnected);
        // this.socket.on = this.delegate;
        // this.socket.on("gamestate units", this.onDataUnits);        
        // this.socket.on("gamestate init", this.onDataInit);
        // this.socket.on("gamestate tiles", this.onDataTiles);
        // this.socket.on("gamestate unit spawned", this.onDataNewUnit);
    }

    /**
     * Sends a login request to the server.
     */
    login(name, password) {
        this.socket.emit("login", {name: "Spieler "+Math.random().toFixed(2)});
    }

    /**
     * Sends a movement command to the Server (WASD).
     */
    sendMovement(id, direction, state) {
        this.socket.emit("input "+direction, {id: id, state: state});
    }

    /**
     * Sends a movement command to the Server (click on map).
     */
    sendMovementClick(unitIds, pos) {
        this.socket.emit("input click", {
            unitIds: unitIds,
            pos: pos
        });
    }

    /**
     * Sends a spawn request to the server.
     */
    requestSpawn(pos) {
        this.socket.emit("input spawn", pos);
    }

    /**
     * Sends a tile request to the Server
     */
    requestTiles(unit_id, requested_tiles) {
        this.socket.emit("tiles visible", {
            unit_id: unit_id,
            requested_tiles: requested_tiles
        });
    }
};