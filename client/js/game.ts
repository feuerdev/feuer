/**
 * Created by Jannik on 04.09.2016.
 */

import Renderer from "./renderer";
import Log from "./util/log";
import * as io from "./lib/socket.io.min";
import * as $ from "./lib/jquery-3.1.1.min";
import * as Util from "../../shared/util";
import { Socket } from "../../node_modules/@types/socket.io";
import Vector2 from "../../shared/vector2";
import Hex, {Layout, Orientation} from "../../shared/hex";

export default class Game {

    private readonly delta = Math.round(1000 / config.updaterate);
    private readonly defaultDelta = Math.round(1000 / 60);

    private isRunning: boolean = false;

    public socket: Socket;

    private renderer: Renderer = new Renderer(this);

    //Aktuelle Cursor Position
    public dragDistance: number = 0;
    public cursorWorld: Vector2 = new Vector2();
    public cursorCanvas: Vector2 = new Vector2();
    public aimPoint: Vector2;
    public aimPointRequested: Vector2;
    private isM2Down: boolean = false;

    public players = [];
    
    public tiles:{};


    public mapWidth: number;
    public mapHeight: number;
    public username: string;

    //Hex
    public orientation:Orientation = Layout.flat;;
    public layout:Layout = new Layout(this.orientation, new Vector2(config.hex_width, config.hex_height), new Vector2(0,0));

    public selectedHex:Hex;

    //Wrapper um window.requestAnimationFrame()
    private requestAnimationFrameWrapper: Function = (function () {
        return (window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / config.updaterate);
            }).bind(window);
    })();

    constructor() {
        let canvas;
        if ($("#canvas-entities").length > 0) {
            canvas = $("#canvas-entities");
        } else if ($("#canvas-fow").length > 0) {
            canvas = $("#canvas-fow");
        } else if ($("#canvas-map").length > 0) {
            canvas = $("#canvas-map");
        }

        window.addEventListener("keydown", event => {
            switch (event.keyCode) {
                //case 65: this.gunLeft = true;  break;//a
            }
        }, false);
        window.addEventListener("keyup", event => {
            switch (event.keyCode) {
                case 70: this.renderer.toggleFollowMode(); break;//f
                case 187: this.renderer.zoomIn(); break;//+
                case 189: this.renderer.zoomOut(); break;//-   
                case 191: this.renderer.zoomReset(); break;//#
                case 80: this.renderer.toggleDebug(); break;//#
                //case 32: this.socket.emit("input shoot"); break;//# 
            }
        }, false);
        window.addEventListener("mousewheel", event => {
            event.wheelDelta > 0 ? this.renderer.zoomIn() : this.renderer.zoomOut();
            this.updateCursor(event);
        }, false);
        window.addEventListener("click", event => {
            switch (event.which) {
                case 1: { //Linksclick
                    this.selectedHex = this.layout.pixelToHex(this.cursorWorld).round();
                    break;
                }
                // case 2: this.renderer.switchFollowMode(); break;//Mittelclick?
            }
        });

        canvas.mousemove(event => {
            if (this.isM2Down) {
                this.renderer.isDragging = true;
                this.renderer.isFollowing = false;
                this.dragDistance += (Math.abs(this.cursorCanvas.x - event.offsetX) + Math.abs(this.cursorCanvas.y - event.offsetY));
            }
            this.updateCursor(event);
        });
        canvas.mousedown(event => {
            if (event.button === 0) { //Leftclick
                //
            } else if (event.button === 2) { //Rightclick
                this.isM2Down = true;
            }
        });
        canvas.mouseup(event => {
            if (event.button === 0) { //Leftclick
                //
            } else if (event.button === 2) { //Rightclick
                this.isM2Down = false;
                this.renderer.isDragging = false;
                if (this.dragDistance < config.click_distance_threshold) {
                    //Rechtsklick
                }
                this.dragDistance = 0;
            }
        });
        canvas.mouseout(() => {
            this.isM2Down = false;
            this.renderer.isDragging = false
        });
    }

    private updateCursor(event) {
        this.cursorCanvas.x = event.offsetX;
        this.cursorCanvas.y = event.offsetY;
        this.cursorWorld.x = (event.offsetX / this.renderer.currentZoom) + this.renderer.cameraPos.x;
        this.cursorWorld.y = (event.offsetY / this.renderer.currentZoom) + this.renderer.cameraPos.y;
    }

    public connect() {
        this.socket = io.connect(config.ip, { transports: config.transports });
        this.socket.on("connect", () => this.onConnected());
        this.socket.on("disconnect", () => this.onDisconnected);
        this.socket.on("gamestate players", (data) => this.onGamestatePlayers(data));
        this.socket.on("gamestate tiles", (data) => this.onGamestateTiles(data));
        //this.socket.on("gamestate death", () => this.onGamestateDeath());
        //this.socket.on("info mapwidth", (data) => { this.mapWidth = data });
    }

    public run() {
        const self = this;
        this.isRunning = true;
        let lastTime = Date.now();
        let accumulator = 0;

        const gameLoop = function () {
            if (self.isRunning) {
                let newTime = Date.now();
                let frameTime = newTime - lastTime;

                lastTime = newTime;

                accumulator += frameTime;

                while (accumulator > self.delta) {
                    self.update(self.delta / self.defaultDelta);
                    accumulator -= self.delta;
                }

                self.renderer.draw();
                self.requestAnimationFrameWrapper(gameLoop, 0);
            }
        };
        gameLoop();
    }

    private update(deltaFactor) {

    }

    private onConnected() {
        Log.info("Connected");
        const self = this;
        function waitForUid() {            
            if (currentUid) {
                self.socket.emit("initialize", currentUid);
            } else {
              console.log("uid not set yet. trying again...");
              setTimeout(waitForUid, 300);
            }
          }
          waitForUid();
    }

    private onDisconnected() {
        Log.info("Disonnected");
    }

    private onGamestatePlayers(players) {
        this.players = players;
        players.forEach(p => {
            if(p.uid === currentUid) {
                //this.ship = p.ship;
            }
        });
    }

    private onGamestateTiles(tiles) {
        this.tiles = tiles;
    }

    private onGamestateDeath() {

        $('#death').show();
        $("#canvas-entities").hide();        
        $("#canvas-fow").hide();
        $("#canvas-map").hide();
        
        function goBack() {
            window.location.replace("/");
        }
        setTimeout(goBack, 2000);
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
    location;
}
declare const window: Window;
declare const config;
declare const currentUid;