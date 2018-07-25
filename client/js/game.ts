/**
 * Created by Jannik on 04.09.2016.
 */

import Renderer from "./renderer";
import Log from "./util/log";
import * as io from "./lib/socket.io.min";
import * as $ from "./lib/jquery-3.1.1.min";
import * as Util from "./util/util";
import { Socket } from "../../node_modules/@types/socket.io";

export default class Game {
    private isRunning: boolean = false;

    public socket: Socket;

    private renderer: Renderer = new Renderer(this);

    //Aktuelle Cursor Position
    public cursorWorld: { x, y } = { x: -1, y: -1 };
    public cursorCanvas: { x, y } = { x: -1, y: -1 };

    private isM1Down: boolean = false;
    private isM2Down: boolean = false;

    public ship: any;
    public ships = [];
    public shells = [];

    public mapWidth: number;
    public mapHeight: number;
    public teamId: number;

    public rudderPosition: number = 0;
    public speed: number = 0;
    public gunAngleVertical: number = 0;
    public gunAngleHorizontal: number = 0;

    private rudderLeft: boolean = false;
    private rudderRight: boolean = false;
    private speedUp: boolean = false;
    private speedDown: boolean = false;
    private gunUp: boolean = false;
    private gunDown: boolean = false;
    private gunLeft: boolean = false;
    private gunRight: boolean = false;

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
                case 65: this.gunLeft = true; break;//a
                case 87: this.gunUp = true; break;//w                    
                case 68: this.gunRight = true; break;//d
                case 83: this.gunDown = true; break;//s          
                case 38: this.speedUp = true; break;//pfeilhoch
                case 40: this.speedDown = true; break;//pfeilrunter
                case 37: this.rudderLeft = true; break;//pfeillinks
                case 39: this.rudderRight = true; break;//pfeilrechts
            }
        }, false);
        window.addEventListener("keyup", event => {
            switch (event.keyCode) {
                case 65: this.gunLeft = false; break;//a
                case 87: this.gunUp = false; break;//w                    
                case 68: this.gunRight = false; break;//d
                case 83: this.gunDown = false; break;//s
                case 38: this.speedUp = false; break;//pfeilhoch
                case 88: { this.rudderPosition = 0; this.socket.emit("input rudder", this.rudderPosition); } break;//x
                case 40: this.speedDown = false; break;//pfeilrunter
                case 37: this.rudderLeft = false; break;//pfeillinks
                case 39: this.rudderRight = false; break;//pfeilrechts
                case 70: this.renderer.switchFollowMode(); break;//f
                case 187: this.renderer.zoomIn(); break;//+
                case 189: this.renderer.zoomOut(); break;//-   
                case 191: this.renderer.zoomReset(); break;//#
                case 32: this.socket.emit("input shoot"); break;//# 
            }
        }, false);
        window.addEventListener("mousewheel", event => {
            event.wheelDelta > 0 ? this.renderer.zoomIn() : this.renderer.zoomOut();
            this.updateCursor(event);
        }, false);
        window.addEventListener("click", event => {
            console.log(event.which);
            switch (event.which) {
                case 1: { //Linksclick
                    this.gunAngleHorizontal = this.calculateHorizontalAngle(this.cursorWorld);
                    this.gunAngleVertical = this.calculateVerticalAngle(this.cursorWorld);
                    this.socket.emit("input gun horizontal", this.gunAngleHorizontal);
                    this.socket.emit("input gun vertical", this.gunAngleVertical);
                    break;
                }
                // case 2: this.renderer.switchFollowMode(); break;//Mittelclick?
            }
        });

        canvas[0].addEventListener("contextmenu", (event) => { //Rechtsklick

        });

        canvas.mousemove(event => {
            if (this.isM2Down) {
                this.renderer.isDragging = true;
                this.renderer.isFollowing = false;
            }
            this.updateCursor(event);
        });
        canvas.mousedown(event => {
            if (event.button === 0) { //Leftclick
                this.isM1Down = true;
            } else if (event.button === 2) { //Rightclick
                this.isM2Down = true;
            }
        });
        canvas.mouseup(event => {
            if (event.button === 0) { //Leftclick
                this.isM1Down = false;
            } else if (event.button === 2) { //Rightclick
                this.isM2Down = false;
                this.renderer.isDragging = false;
            }
        });
        canvas.mouseout(() => {
            this.isM1Down = false;
            this.isM2Down = false;
            this.renderer.isDragging = false
        });
    }

    private calculateHorizontalAngle(toPos: {x,y}): number {
        Log.debug(Util.radiansToDegrees(Math.atan2(toPos.y - this.ship.pos.y, toPos.x - this.ship.pos.x)));
        Log.debug(this.ship.orientation);
        const bojanWinkel = Math.atan2(toPos.y - this.ship.pos.y, toPos.x - this.ship.pos.x) + 180;
        const bojandifference = bojanWinkel-this.gunAngleHorizontal;
        return bojandifference + this.gunAngleHorizontal;
        // return Util.radiansToDegrees(Math.atan2(toPos.y - this.ship.pos.y, toPos.x - this.ship.pos.x)) - this.ship.orientation;
    }

    private calculateVerticalAngle(toPos: {x,y}):number {

        const d = Math.sqrt(Math.pow(toPos.x - this.ship.pos.x, 2) + Math.pow(toPos.y - this.ship.pos.y, 2));
        const g = -config.gravity;
        const v = this.ship.gun.velocity;

        const result = Math.atan((Math.pow(v, 2)-Math.sqrt(Math.pow(v, 4)-g*(g*(g*Math.pow(d,2))))) / (d*g));
        return result;
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
        this.socket.on("gamestate ship", (data) => this.onGamestateShip(data));
        this.socket.on("gamestate ships", (data) => this.onGamestateShips(data));
        this.socket.on("gamestate shells", (data) => this.onGamestateShells(data));
        this.socket.on("info mapwidth", (data) => { this.mapWidth = data });
        this.socket.on("info mapheight", (data) => { this.mapHeight = data });
        this.socket.on("info teamId", (data) => { this.teamId = data });
    }

    public run() {
        const self = this;
        this.isRunning = true;
        const delta = Math.round(1000 / config.updaterate);
        const defaultDelta = Math.round(1000 / 60);
        let lastTime = Date.now();
        let accumulator = 0;

        const gameLoop = function () {
            if (self.isRunning) {
                let newTime = Date.now();
                let frameTime = newTime - lastTime;

                lastTime = newTime;

                accumulator += frameTime;

                while (accumulator > delta) {
                    self.update(delta / defaultDelta);
                    accumulator -= delta;
                }

                self.renderer.draw();
                self.requestAnimationFrameWrapper(gameLoop, 0);
            }
        };
        gameLoop();
    }

    private update(delta) {
        if (this.rudderLeft) {
            this.rudderPosition -= 1 * delta;
            this.rudderPosition = Util.clamp(this.rudderPosition, -90, 90);
            this.socket.emit("input rudder", this.rudderPosition);
        }
        if (this.rudderRight) {
            this.rudderPosition += 1 * delta;
            this.rudderPosition = Util.clamp(this.rudderPosition, -90, 90);
            this.socket.emit("input rudder", this.rudderPosition);
        }
        if (this.gunDown) {
            this.gunAngleVertical -= 1 * delta;
            this.gunAngleVertical = Util.clamp(this.gunAngleVertical, this.ship.gun.minAngleVertical, this.ship.gun.maxAngleVertical);
            this.socket.emit("input gun vertical", this.gunAngleVertical);
        }
        if (this.gunUp) {
            this.gunAngleVertical += 1 * delta;
            this.gunAngleVertical = Util.clamp(this.gunAngleVertical, this.ship.gun.minAngleVertical, this.ship.gun.maxAngleVertical);
            this.socket.emit("input gun vertical", this.gunAngleVertical);
        }
        if (this.gunLeft) {
            this.gunAngleHorizontal -= 1 * delta;
            this.gunAngleHorizontal = Util.clamp(this.gunAngleHorizontal, this.ship.gun.minAngleHorizontal, this.ship.gun.maxAngleHorizontal);
            this.socket.emit("input gun horizontal", this.gunAngleHorizontal);
        }
        if (this.gunRight) {
            this.gunAngleHorizontal += 1 * delta;
            this.gunAngleHorizontal = Util.clamp(this.gunAngleHorizontal, this.ship.gun.minAngleHorizontal, this.ship.gun.maxAngleHorizontal);
            this.socket.emit("input gun horizontal", this.gunAngleHorizontal);
        }
        if (this.speedUp) {
            this.speed += 1 * delta;
            this.speed = Util.clamp(this.speed, this.ship.speed_min, this.ship.speed_max);
            this.socket.emit("input speed", this.speed);
        }
        if (this.speedDown) {
            this.speed -= 1 * delta;
            this.speed = Util.clamp(this.speed, this.ship.speed_min, this.ship.speed_max);
            this.socket.emit("input speed", this.speed);
        }
    }

    private onConnected() {
        Log.info("Connected");
    }

    private onDisconnected() {
        Log.info("Disonnected");
    }

    private onGamestateShip(ship) {
        this.ship = ship;
    }

    private onGamestateShips(ships) {
        this.ships = ships;
    }

    private onGamestateShells(shells) {
        this.shells = shells;
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