/**
 * Created by Jannik on 04.09.2016.
 */

import Renderer from "./renderer";
import Log from "./util/log";
import * as io from "./lib/socket.io.min";
import * as $ from "./lib/jquery-3.1.1.min";
import * as Util from "./util/util";
import { Socket } from "../../node_modules/@types/socket.io";
import Vector2 from "../../shared/vector2";

export default class Game {

    private readonly delta = Math.round(1000 / config.updaterate);
    private readonly defaultDelta = Math.round(1000 / 60);

    private isRunning: boolean = false;

    public socket: Socket;

    private renderer: Renderer = new Renderer(this);

    //Aktuelle Cursor Position
    public cursorWorld: { x, y } = { x: -1, y: -1 };
    public cursorCanvas: { x, y } = { x: -1, y: -1 };
    public aimPoint: { x, y };

    private isM1Down: boolean = false;
    private isM2Down: boolean = false;

    public ship: any;
    public ships = [];
    public shells = [];

    public mapWidth: number;
    public mapHeight: number;
    public teamId: number;

    public waypoint: { x: number, y: number };
    public angleToWaypoint: number;

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

    private rudderLeftTime: number = 0;
    private rudderRightTime: number = 0;
    private gunLeftTime: number = 0;
    private gunRightTime: number = 0;
    private gunUpTime: number = 0;
    private gunDownTime: number = 0;
    private speedUpTime: number = 0;
    private speedDownTime: number = 0;

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
                case 65: this.gunLeft = true; this.aimPoint = null; break;//a
                case 87: this.gunUp = true; this.aimPoint = null; break;//w                    
                case 68: this.gunRight = true; this.aimPoint = null; break;//d
                case 83: this.gunDown = true; this.aimPoint = null; break;//s          
                case 38: this.speedUp = true; break;//pfeilhoch
                case 40: this.speedDown = true; break;//pfeilrunter
                case 37: this.rudderLeft = true; this.waypoint = null; break;//pfeillinks
                case 39: this.rudderRight = true; this.waypoint = null; break;//pfeilrechts
            }
        }, false);
        window.addEventListener("keyup", event => {
            switch (event.keyCode) {
                case 65: this.gunLeft = false; this.gunLeftTime = 0; this.gunAngleHorizontal = Util.clamp(--this.gunAngleHorizontal, this.ship.gun.minAngleHorizontal, this.ship.gun.maxAngleHorizontal); this.socket.emit("input gun horizontal", this.gunAngleHorizontal); break;//a
                case 87: this.gunUp = false; this.gunUpTime = 0; this.gunAngleVertical = Util.clamp(++this.gunAngleVertical, this.ship.gun.minAngleVertical, this.ship.gun.maxAngleVertical); this.socket.emit("input gun vertical", this.gunAngleVertical); break;//w                    
                case 68: this.gunRight = false; this.gunRightTime = 0; this.gunAngleHorizontal = Util.clamp(++this.gunAngleHorizontal, this.ship.gun.minAngleHorizontal, this.ship.gun.maxAngleHorizontal); this.socket.emit("input gun horizontal", this.gunAngleHorizontal); break;//d
                case 83: this.gunDown = false; this.gunDownTime = 0; this.gunAngleVertical = Util.clamp(--this.gunAngleVertical, this.ship.gun.minAngleVertical, this.ship.gun.maxAngleVertical); this.socket.emit("input gun vertical", this.gunAngleVertical); break;//s
                case 38: this.speedUp = false; this.speedUpTime = 0; this.speed = Util.clamp(++this.speed, this.ship.speed_min, this.ship.speed_max); this.socket.emit("input speed", this.speed); break;//pfeilhoch
                case 40: this.speedDown = false; this.speedDownTime = 0; this.speed = Util.clamp(--this.speed, this.ship.speed_min, this.ship.speed_max); this.socket.emit("input speed", this.speed); break;//pfeilrunter
                case 37: this.rudderLeft = false; this.rudderLeftTime = 0; this.rudderPosition = Util.clamp(--this.rudderPosition, -90, 90); this.socket.emit("input rudder", this.rudderPosition); break;//pfeillinks
                case 88: this.rudderPosition = 0; this.socket.emit("input rudder", this.rudderPosition); break;//x
                case 39: this.rudderRight = false; this.rudderRightTime = 0; this.rudderPosition = Util.clamp(++this.rudderPosition, -90, 90); this.socket.emit("input rudder", this.rudderPosition); break;//pfeilrechts
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
                    this.socket.emit("input gun horizontal", this.gunAngleHorizontal);

                    let vertical = this.calculateVerticalAngle(this.cursorWorld);
                    if (!Number.isNaN(vertical)) {
                        this.aimPoint = { x: this.cursorWorld.x, y: this.cursorWorld.y };
                        this.gunAngleVertical = this.calculateVerticalAngle(this.cursorWorld);
                        this.socket.emit("input gun vertical", this.gunAngleVertical);
                    }

                    break;
                }
                // case 2: this.renderer.switchFollowMode(); break;//Mittelclick?
            }
        });

        canvas[0].addEventListener("contextmenu", (event) => { //Rechtsklick
            if (!this.renderer.isDragging) { //TODO: This doesnt work. Fix it.
                this.waypoint = new Vector2(this.cursorWorld.x, this.cursorWorld.y);
                if(this.speed <= 0) { 
                    this.speed = this.ship.speed_max;
                    this.socket.emit("input speed", this.speed);
                }
            }
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

    private calculateHorizontalAngle(toPos: { x, y }): number {
        let result = Util.radiansToDegrees(Math.atan2((toPos.y - this.ship.height / 2) - this.ship.pos.y, (toPos.x - this.ship.width / 2) - this.ship.pos.x)) - this.ship.orientation;
        if (result < -180) { //Das verstehe ich nicht ganz
            result += 360;
        }
        result = Util.clamp(result, this.ship.gun.minAngleHorizontal, this.ship.gun.maxAngleHorizontal);

        return result;
    }

    private calculateVerticalAngle(toPos: { x, y }): number {
        const d = Math.sqrt(Math.pow(toPos.x - this.ship.pos.x, 2) + Math.pow(toPos.y - this.ship.pos.y, 2));
        const g = -config.gravity;
        const v = this.ship.gun.velocity;
        let result = Util.radiansToDegrees(Math.asin(d * g / (Math.pow(v, 2))) / 2);
        result = Util.clamp(result, this.ship.gun.minAngleVertical, this.ship.gun.maxAngleVertical);
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
        if (this.waypoint) {
            if (new Vector2(this.waypoint, this.ship.pos).length() < config.waypoint_distance_threshold) {
                this.rudderPosition = 0;
                this.waypoint = null;
            } else {
                this.angleToWaypoint = Util.radiansToDegrees(Math.atan2((this.waypoint.y - this.ship.height / 2) - this.ship.pos.y, (this.waypoint.x - this.ship.width / 2) - this.ship.pos.x)) - this.ship.orientation;
                if (this.angleToWaypoint < -180) { //Das verstehe ich nicht ganz
                    this.angleToWaypoint += 360;
                }
                const autoRudder = Util.clamp(this.angleToWaypoint * 4, -90, 90);

                if (Math.round(autoRudder) !== this.rudderPosition) {
                    this.rudderPosition = autoRudder;
                }
            }
            this.socket.emit("input rudder", this.rudderPosition);
        }

        if (this.rudderLeft) {
            this.rudderLeftTime += this.delta
            if (this.rudderLeftTime > config.input_time_threshold) {
                this.rudderPosition -= 1 * config.input_factor * deltaFactor;
                this.rudderPosition = Util.clamp(this.rudderPosition, -90, 90);
                this.socket.emit("input rudder", this.rudderPosition);
            }
        }
        if (this.rudderRight) {
            this.rudderRightTime += this.delta;
            if (this.rudderRightTime > config.input_time_threshold) {
                this.rudderPosition += 1 * config.input_factor * deltaFactor;
                this.rudderPosition = Util.clamp(this.rudderPosition, -90, 90);
                this.socket.emit("input rudder", this.rudderPosition);
            }
        }
        if (this.gunDown) {
            this.gunDownTime += this.delta;
            if (this.gunDownTime > config.input_time_threshold) {
                this.gunAngleVertical -= 1 * config.input_factor * deltaFactor;
                this.gunAngleVertical = Util.clamp(this.gunAngleVertical, this.ship.gun.minAngleVertical, this.ship.gun.maxAngleVertical);
                this.socket.emit("input gun vertical", this.gunAngleVertical);
            }
        }
        if (this.gunUp) {
            this.gunUpTime += this.delta;
            if (this.gunUpTime > config.input_time_threshold) {
                this.gunAngleVertical += 1 * config.input_factor * deltaFactor;
                this.gunAngleVertical = Util.clamp(this.gunAngleVertical, this.ship.gun.minAngleVertical, this.ship.gun.maxAngleVertical);
                this.socket.emit("input gun vertical", this.gunAngleVertical);
            }
        }
        if (this.gunLeft) {
            this.gunLeftTime += this.delta;
            if (this.gunLeftTime > config.input_time_threshold) {
                this.gunAngleHorizontal -= 1 * config.input_factor * deltaFactor;
                this.gunAngleHorizontal = Util.clamp(this.gunAngleHorizontal, this.ship.gun.minAngleHorizontal, this.ship.gun.maxAngleHorizontal);
                this.socket.emit("input gun horizontal", this.gunAngleHorizontal);
            }
        }
        if (this.gunRight) {
            this.gunRightTime += this.delta;
            if (this.gunRightTime > config.input_time_threshold) {
                this.gunAngleHorizontal += 1 * config.input_factor * deltaFactor;
                this.gunAngleHorizontal = Util.clamp(this.gunAngleHorizontal, this.ship.gun.minAngleHorizontal, this.ship.gun.maxAngleHorizontal);
                this.socket.emit("input gun horizontal", this.gunAngleHorizontal);
            }
        }
        if (this.speedUp) {
            this.speedUpTime += this.delta;
            if (this.speedUpTime > config.input_time_threshold) {
                this.speed += 1 * config.input_factor * deltaFactor;
                this.speed = Util.clamp(this.speed, this.ship.speed_min, this.ship.speed_max);
                this.socket.emit("input speed", this.speed);
            }
        }
        if (this.speedDown) {
            this.speedDownTime += this.delta;
            if (this.speedDownTime > config.input_time_threshold) {
                this.speed -= 1 * config.input_factor * deltaFactor;
                this.speed = Util.clamp(this.speed, this.ship.speed_min, this.ship.speed_max);
                this.socket.emit("input speed", this.speed);
            }
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