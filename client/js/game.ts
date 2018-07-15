/**
 * Created by Jannik on 04.09.2016.
 */

import Renderer from "./renderer";
import Tile from "./tile";
// import Input from "./input";
import Log from "./util/log";
import * as Util from "./util/util";
import * as io from "./lib/socket.io.min";
import * as $ from "./lib/jquery-3.1.1.min";
import { Socket } from "../../node_modules/@types/socket.io";

export default class Game {
    private isRunning: boolean = false;

    private socket: Socket;

    private renderer: Renderer = new Renderer(this);

    //Aktuelle Cursor Position
    public cursorWorld: {x,y} = {x: -1, y: -1};
    public cursorCanvas: {x,y} = {x: -1, y: -1};

    public selection = [];

    public tileCache: Tile[] = null;
    public units_owned = {};
    public units_other = {};

    public size: number;
    public tileSize: number;
    public worldSize: number;

    private isM1Down:boolean = false;
    private isM2Down:boolean = false;

    //Wrapper um window.requestAnimationFrame()
    private requestAnimationFrameWrapper: Function = (function(){
        return (window.requestAnimationFrame   ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function(callback){
                window.setTimeout(callback, 1000 / config.updaterate);
        }).bind(window);
    })();

    constructor() {

        let canvas;
        if($("#canvas-entities").length > 0) {
            canvas = $("#canvas-entities");
        } else if($("#canvas-fow").length > 0) {
            canvas = $("#canvas-fow");
        } else if($("#canvas-map").length > 0) {
            canvas = $("#canvas-map");
        }

        window.addEventListener("keydown", event => this.onKeyDown(event), false);
        window.addEventListener("keyup", event => this.onKeyUp(event), false);
        window.addEventListener("mousewheel", event => this.onMouseWheel(event), false);
        window.addEventListener("click", event => this.onClick(event));

        canvas.mousemove(event => this.onMouseMove(event));
        canvas.mousedown(event => this.onMouseDown(event));
        canvas.mouseup(event => this.onMouseUp(event));
        canvas.mouseout(() => this.onMouseOut);
    }

    connect() {
        this.socket = io.connect(config.ip, {transports: config.transports});
        this.socket.on("connect", () => this.onConnected);
        this.socket.on("disconnect", () => this.onDisconnected);
        this.socket.on("gamestate units", () =>this.onDataUnits);        
        this.socket.on("gamestate init", () =>this.onDataInit);
        this.socket.on("gamestate tiles", () =>this.onDataTiles);
        this.socket.on("gamestate unit spawned", () =>this.onDataNewUnit);
    }

    run() {
        const self = this;
        this.isRunning = true;
        const delta  = Math.round(1000 / config.updaterate);
        let lastTime = Date.now();
        let accumulator = 0;

        const gameLoop = function() {
            if(self.isRunning) {
                let newTime = Date.now();
                let frameTime = newTime - lastTime;

                lastTime = newTime;

                accumulator += frameTime;

                while(accumulator > delta) {
                    self.update(delta);
                    accumulator -= delta;
                }

                self.renderer.draw();
                self.requestAnimationFrameWrapper(gameLoop, 0);
            }
        };
        
        gameLoop();
    }

    stop() {
        this.isRunning = false;
    }

    update(delta) {
        this.updateWorld(delta);
    }

    updateWorld(delta) {
        for(let id in this.units_owned) {
            const unit = this.units_owned[id];
            const newTileX = Math.floor(Math.max(unit.pos.x - 1, 0) / this.tileSize);
            const newTileY = Math.floor(Math.max(unit.pos.y - 1, 0) / this.tileSize);

            if(!unit.currentTile) {
                unit.currentTile = {
                    x: -1,
                    y: -1
                };
            }
            if(newTileX != unit.currentTile.x || newTileY != unit.currentTile.y) { //If player has moved off of tile. //TODO: Funktioniert nicht, weil das Unit Objekt immer vom Server ueberschrieben wird.
                const tilesToRequest = [];
                // var xDirection = this.currentTile.x - newTileX; //TODO: Only calculate Vision in the direction of travel using xDirection and yDirection
                // var yDirection = this.currentTile.y - newTileY;
                for(let x = newTileX - unit.visibility; x <= newTileX; x++) { //Only search in one direction
                    for(let y = newTileY - unit.visibility; y <= newTileY; y++) { //Only search in one direction
                        const wrappedX = Util.mod(x, this.size);
                        const wrappedY = Util.mod(y, this.size);
                        if((x - newTileX) * (x - newTileX) + (y - newTileY) * (y - newTileY) <= unit.visibility * unit.visibility) { //Calculate distance

                            const xSym = Util.mod(newTileX - (x - newTileX), this.size); //Use Symmetry
                            const ySym = Util.mod(newTileY - (y - newTileY), this.size);

                            const t1 = this.tileCache[wrappedX][wrappedY]; //Calculated tile
                            const t2 = this.tileCache[wrappedX][ySym]; //Calculated vertical Symmetry
                            const t3 = this.tileCache[xSym][wrappedY]; //Calculated horizontal Symmetry
                            const t4 = this.tileCache[xSym][ySym]; //Calculated "diagonal" Symmetry

                            if(!t1) {
                                tilesToRequest.push({
                                    x: wrappedX,
                                    y: wrappedY
                                });
                            }
                            if(!t2) {
                                tilesToRequest.push({
                                    x: wrappedX,
                                    y: ySym
                                });
                            }
                            if(!t3) {
                                tilesToRequest.push({
                                    x: xSym,
                                    y: wrappedY
                                });
                            }
                            if(!t4) {
                                tilesToRequest.push({
                                    x: xSym,
                                    y: ySym
                                });
                            }
                        }
                    }
                }
                if(tilesToRequest.length > 0) {
                    this.requestTiles(id, tilesToRequest);
                }
            }
            unit.currentTile.x = newTileX;
            unit.currentTile.y = newTileY;
        }
    }

    updateUnits(data) {
        //own units
        const units_own_remote = data.units_owned;
        for(let id in units_own_remote) {
            const unit_remote = units_own_remote[id];
            const unit_local = this.units_owned[unit_remote.id];
            if(unit_local) {
                for(let key in unit_remote) {
                    if(unit_local.hasOwnProperty(key)) {
                        unit_local[key] = unit_remote[key];
                    }
                }
            } else {
                this.units_owned[unit_remote.id] = unit_remote;
            }
        }

        //other
        const units_other_remote = data.units_other;
        for(let id in units_other_remote) {
            const unit_remote = units_other_remote[id];
            const unit_local = this.units_other[unit_remote.id];
            if(unit_local) {
                for(let key in unit_remote) {
                    if(unit_local.hasOwnProperty(key)) {
                        unit_local[key] = unit_remote[key];
                    }
                }
            } else {
                this.units_other[unit_remote.id] = unit_remote;
            }
        }
    }

    /**
     * The data of the world is initiated by the server. 
     */
    init(data) {
        this.size = data.size;
        this.tileSize = data.tileSize;
        this.worldSize = this.size * this.tileSize;
        this.tileCache = Util.createSquareArray(this.size);
        if(data.tiles) {
            for(var x = 0; x < this.tileCache.length; x++) {
                for(var y = 0; y < this.tileCache.length; y++) {
                    this.tileCache[x][y] = new Tile(x, y, data.tiles[x][y]);
                }
            }
        }
    }

    addTiles(tiles) {
        let i;
        for(i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            this.tileCache[tile.x][tile.y] = new Tile(tile.x, tile.y, tile.z);
        }
    }

    onClick(event) {
        switch(event.which) {
            case 1: //Linksclick
                this.onMovementClick();
                break;
            case 2: //Mittelclick?
                this.renderer.switchFollowMode();
                break;
        }
    };

    onMouseWheel(event) {
        if(event.wheelDelta > 0) {
            this.renderer.zoomIn();
        } else {
            this.renderer.zoomOut();
        }
    };

    onMouseMove(event) {
        if(this.isM2Down) {
            this.onDragStart();
        }
        this.onCursorMoved(event);
        
    };

    onMouseDown(event) {
        if(event.button === 0) { //Leftclick
            this.isM1Down = true;
        } else if(event.button === 2) { //Rightclick
            this.isM2Down = true;
        }

    };

    onMouseUp(event) {
        if(event.button === 0) { //Leftclick
            this.isM1Down = false;
        } else if(event.button === 2) { //Rightclick
            this.isM2Down = false;
            this.renderer.isDragging = false;
        }
    };

    onMouseOut() {
        this.renderer.isDragging = false;
    };

    onKeyDown(event) {
        this.onKeyPressed(event, true);
    };

    onKeyUp(event) {
        this.onKeyPressed(event, false);
    };

    onKeyPressed(event, pressed) {
        switch(event.keyCode) {
            case 65: // a
                this.onMovement("left", pressed);
                break;
            case 87: // w
                this.onMovement("up", pressed);
                break;
            case 68: // d
                this.onMovement("right", pressed);
                break;
            case 83: // s
                this.onMovement("down", pressed);
                break;
            case 69: //e
                this.requestSpawn(this.cursorWorld);
                break;
            case 187: // +
                if(pressed) {
                    this.renderer.zoomIn();
                }
                break;
            case 189: // -
                if(pressed) {
                    this.renderer.zoomOut();
                }
                break;
            case 191: // #
                if(pressed) {
                    this.renderer.zoomReset();
                }
                break;
            case 70: // f
                if(pressed) {
                    this.renderer.switchFollowMode();
                }
                break;
        }
    };

    onMovementClick() {
        this.socket.emit("input click", {
            unitIds: this.selection,
            pos: {x: this.cursorWorld.x, y: this.cursorWorld.y}
        });
    }     

    onMovement(direction, state) {        
        this.socket.emit("input "+direction, {id: direction, state: state});
    }

    onDragStart () {
        this.renderer.isDragging = true;
        this.renderer.isFollowing = false;
    }
 
    onCursorMoved (event) {
        this.cursorCanvas.x = event.offsetX;
        this.cursorCanvas.y = event.offsetY;
        this.cursorWorld.x = Util.mod((event.offsetX / this.renderer.currentZoom) + this.renderer.cameraPos.x, this.worldSize);
        this.cursorWorld.y = Util.mod((event.offsetY / this.renderer.currentZoom) + this.renderer.cameraPos.y, this.worldSize);
    }

    onConnected () {
        Log.info("Connected");
        this.login("a", "b");
    }
    
    onDisconnected () {
        Log.info("Disonnected");
    }

    onDataUnits (data) {
        this.updateUnits(data);
    }

    onDataTiles (data) {
        this.addTiles(data);
        this.renderer.shouldRedrawMap = true;
    }

    onDataInit (data) {
        this.init(data);            
        this.run();
    }

    onDataNewUnit (unit) {
        if(unit && unit.id !== -1) {
            if(this.selection.length === 0) {
                this.selection.push(unit.id);
                this.renderer.isFollowing = true;
            }
        }
    }

    /**
     * Sends a login request to the server.
     */
    login(name, password) {
        this.socket.emit("login", {name: "Spieler "+Math.random().toFixed(2)});
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

//Um den ts compiler zu besänftigen
interface Window {
    mozRequestAnimationFrame: Function;
    oRequestAnimationFrame: Function;
    msRequestAnimationFrame: Function;
    requestAnimationFrame: Function;
    webkitRequestAnimationFrame: Function;
    setTimeout: Function;
    addEventListener: Function;
}
declare const window: Window;
declare const config;