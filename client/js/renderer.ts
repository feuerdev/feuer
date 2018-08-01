/**
 * Created by Jannik on 04.09.2016.
 */
import * as $ from "./lib/jquery-3.1.1.min";
import Game from "./game";
import * as Util from "./util/util";
import Vector2 from "../../shared/vector2";

export default class Renderer {

    private game: Game;

    private canvas_map = $("#canvas-map");
    private canvas_fow = $("#canvas-fow");
    private canvas_entities = $("#canvas-entities");
    private container = $("#canvas-container");

    private ctxm: CanvasRenderingContext2D;
    private ctxf: CanvasRenderingContext2D;
    private ctxe: CanvasRenderingContext2D;

    private canvasWidth: number;
    private canvasHeight: number;

    private drawWidth: number;
    private drawHeight: number;

    private zoomFactor: number = 2;

    public currentZoom: number = 1;
    private debug = $("#debug");

    private deadzone: Vector2 = new Vector2(this.canvasWidth / 2 - (50 / this.currentZoom),this.canvasHeight / 2 - (50 / this.currentZoom));
    public cameraPos: Vector2 = new Vector2();
    public cameraPosFollow: Vector2 = new Vector2();

    private cursorCanvasLast: Vector2 = new Vector2();
    public isFollowing: boolean = false;
    public isDragging: boolean = false;

    public shouldRedrawMap: boolean = true;

    readonly img_ship1 = new Image();
    readonly img_ship2 = new Image();
    readonly img_ship3 = new Image();
    readonly img_ship4 = new Image();

    constructor(game: Game) {
        this.game = game;

        this.img_ship1.src = "../img/ship.png";
        this.img_ship2.src = "../img/ship2.png";
        this.img_ship3.src = "../img/ship3.png";
        this.img_ship4.src = "../img/ship4.png";

        this.canvas_map[0].width = this.container.width();
        this.canvas_map[0].height = this.container.height();

        this.canvas_fow[0].width = this.container.width();
        this.canvas_fow[0].height = this.container.height();

        this.canvas_entities[0].width = this.container.width();
        this.canvas_entities[0].height = this.container.height();

        if (this.canvas_map.length > 0) {
            this.ctxm = this.canvas_map[0].getContext("2d");
        }

        if (this.canvas_fow.length > 0) {
            this.ctxf = this.canvas_fow[0].getContext("2d");
        }

        if (this.canvas_entities.length > 0) {
            this.ctxe = this.canvas_entities[0].getContext("2d");
        }

        this.canvasWidth = this.canvas_entities[0].width;
        this.canvasHeight = this.canvas_entities[0].height;

        this.drawWidth = this.canvasWidth;
        this.drawHeight = this.canvasHeight;
    }

    //#region Cycle
    draw() {
        this.ctxm.save();
        this.ctxf.save();
        this.ctxe.save();

        this.ctxe.clearRect(0, 0, this.drawWidth, this.drawHeight);

        this.updateCamera();

        if (this.shouldRedrawMap) {
            this.ctxm.translate(-this.cameraPos.x, -this.cameraPos.y);
            this.drawMap();
        }

        if (config.fow) {
            this.ctxf.translate(-this.cameraPos.x, -this.cameraPos.y);
            this.drawFow();
        }

        this.ctxe.translate(-this.cameraPos.x, -this.cameraPos.y);
        this.drawEntities();

        if (config.log_level === "debug") {
            this.drawDebug();
        }

        this.ctxm.restore();
        this.ctxf.restore();
        this.ctxe.restore();
    }

    updateCamera() {
        if (this.isDragging) {
            this.cameraPos.x -= Math.round((this.game.cursorCanvas.x - this.cursorCanvasLast.x) / this.currentZoom);
            this.cameraPos.y -= Math.round((this.game.cursorCanvas.y - this.cursorCanvasLast.y) / this.currentZoom);
            this.cameraPos.x = Util.clamp(this.cameraPos.x, 0, this.game.mapWidth - this.drawWidth);
            this.cameraPos.y = Util.clamp(this.cameraPos.y, 0, this.game.mapHeight - this.drawHeight);
            this.shouldRedrawMap = true;
        }
        this.cursorCanvasLast.x = this.game.cursorCanvas.x;
        this.cursorCanvasLast.y = this.game.cursorCanvas.y;
    }

    drawEntities() {
        if (this.game.aimPoint) {
            this.drawAimpoint(this.game.aimPoint);
        }

        if(this.game.waypoint) {
            this.drawWaypoint();
        }

        if (this.game.ship) {
            this.drawShip(this.game.ship, true);
        }

        for (let i = 0; i < this.game.ships.length; i++) {
            this.drawShip(this.game.ships[i], false);
        }

        for (let i = 0; i < this.game.shells.length; i++) {
            this.drawShell(this.game.shells[i]);
        }
    }

    drawWaypoint() {
        this.ctxe.save();
        
        this.ctxe.setLineDash([5, 15]);
        this.ctxe.strokeStyle = "red";
        this.ctxe.fillStyle = "red";

        this.ctxe.beginPath();
        this.ctxe.arc(this.game.waypoint.x, this.game.waypoint.y, 5, 0, 2 * Math.PI);
        this.ctxe.fill();

        this.ctxe.beginPath();
        this.ctxe.moveTo(this.game.ship.pos.x + this.game.ship.width / 2, this.game.ship.pos.y + this.game.ship.height / 2);
        this.ctxe.lineTo(this.game.waypoint.x, this.game.waypoint.y);
        this.ctxe.stroke();
        
        this.ctxe.restore();
    }

    drawAimpoint(aimPoint: { x, y }) {
        this.ctxe.beginPath();
        this.ctxe.strokeStyle = "yellow";
        this.ctxe.arc(aimPoint.x, aimPoint.y, 10, 0, 2 * Math.PI);
        this.ctxe.arc(aimPoint.x, aimPoint.y, 15, 0, 2 * Math.PI);
        this.ctxe.arc(aimPoint.x, aimPoint.y, 20, 0, 2 * Math.PI);
        this.ctxe.stroke();
        this.ctxe.closePath();
    }

    drawShell(shell) {
        //Shell zeichnen
        this.ctxe.beginPath();
        this.ctxe.fillStyle = "yellow";
        this.ctxe.arc(shell.pos.x, shell.pos.y - shell.pos.z, 3, 0, 2 * Math.PI);
        this.ctxe.fill();
        //"Schatten" zeichnen
        const shadowSize = Math.max(3 * (1 - shell.pos.z / 500), 0.5); //Diese Zeile kommt von Louis
        this.ctxe.beginPath();
        this.ctxe.fillStyle = "gray";
        this.ctxe.arc(shell.pos.x, shell.pos.y, shadowSize, 0, 2 * Math.PI);
        this.ctxe.fill();
    }

    drawShip(ship, isMine) {
        this.ctxe.save();
        const width: number = ship.width;
        const height: number = ship.height;

        const angleOrientation: number = Util.degreeToRadians(ship.orientation);
        const angleWaypoint: number = Util.degreeToRadians(this.game.angleToWaypoint);

        
        this.ctxe.translate(ship.pos.x + width / 2, ship.pos.y + height / 2);
        //draw the ship
        let image;
        if (ship.teamId === 0) {
            this.ctxe.fillStyle = isMine ? "pink" : "red";
            image = isMine ? this.img_ship1 : this.img_ship2;
        } else if (ship.teamId === 1) {
            this.ctxe.fillStyle = isMine ? "green" : "darkgreen";
            image = isMine ? this.img_ship3 : this.img_ship4;
        }
        this.ctxe.rotate(angleOrientation + (Math.PI / 2));
        this.ctxe.drawImage(image, width / 2 * (-1), height / 2 * (-1), width, height);
        this.ctxe.rotate(-(Math.PI /2));
        // this.ctxe.restore();
        // this.context_entities.fillRect(width / 2 * (-1), height / 2 * (-1), width, height);

        //draw the gun
        const widthGun: number = 12; //TODO: width und height vom Server übernehmen
        const heightGun: number = 2;
        const offsetGun: number = 10;
        const radGunActual = Util.degreeToRadians(ship.gun.angleHorizontalActual);
        const radGunReq = Util.degreeToRadians(ship.gun.angleHorizontalRequested);
        this.ctxe.fillStyle = "black";
        this.ctxe.rotate(radGunActual);
        this.ctxe.fillRect(widthGun + offsetGun / 2 * (-1), heightGun / 2 * (-1), widthGun, heightGun);

        if (isMine) {
            //draw the helper line                
            const lengthHelper: number = 900;
            const thicknessHelper: number = 2;
            const offsetHelper: number = 30;
            this.ctxe.setLineDash([5, 15]);
            this.ctxe.strokeStyle = "yellow";
            this.ctxe.lineWidth = thicknessHelper;
            this.ctxe.beginPath();
            this.ctxe.moveTo(offsetHelper, 0);
            this.ctxe.lineTo(lengthHelper, 0);
            this.ctxe.stroke();
            if (ship.gun.angleHorizontalRequested !== ship.gun.angleHorizontalActual) {
                this.ctxe.rotate(-radGunActual);
                this.ctxe.rotate(radGunReq);
                this.ctxe.strokeStyle = "grey";
                this.ctxe.beginPath();
                this.ctxe.moveTo(offsetHelper, 0);
                this.ctxe.lineTo(lengthHelper, 0);
                this.ctxe.stroke();
            }
        }
        //reset the canvas  
        this.ctxe.restore();
    }

    drawMap() {
        //Clear Canvas
        this.ctxm.save();
        this.ctxm.fillStyle = "darkblue";
        this.ctxm.fillRect(0, 0, this.drawWidth, this.drawHeight);
        this.ctxm.restore();
        this.shouldRedrawMap = false;
    }

    drawFow() {
        //no fow yet
    }

    drawDebug() {
        this.debug.text("");
        this.debug.append("<em>General Information</em><br>");
        if (this.isFollowing) {
            this.debug.append("cameraPosFollow.pos.x   : " + this.cameraPosFollow.x + "<br>");
            this.debug.append("cameraPosFollow.pos.y   : " + this.cameraPosFollow.y + "<br>");
        }
        this.debug.append("Camera.x   : " + this.cameraPos.x + "<br>");
        this.debug.append("Camera.y   : " + this.cameraPos.y + "<br>");
        // this.debug.append("deadz.x   : " + this.deadzone.x + "<br>");
        // this.debug.append("deadz.y   : " + this.deadzone.y + "<br>");
        this.debug.append("Canvas Width   : " + this.canvasWidth + "<br>");
        this.debug.append("Canvas Height   : " + this.canvasHeight + "<br>");
        this.debug.append("Draw Width   : " + this.drawWidth + "<br>");
        this.debug.append("Draw Height   : " + this.drawHeight + "<br>");
        this.debug.append("Map Width   : " + this.game.mapWidth + "<br>");
        this.debug.append("Map Height   : " + this.game.mapHeight + "<br>");
        this.debug.append("Cursor Position X   : " + this.game.cursorWorld.x + "<br>");
        this.debug.append("Cursor Position Y   : " + this.game.cursorWorld.y + "<br>");
        this.debug.append("Cursor Canvas Position X   : " + this.game.cursorCanvas.x + "<br>");
        this.debug.append("Cursor Canvas Position Y   : " + this.game.cursorCanvas.y + "<br>");
        this.debug.append("Mouse Distance   : " + this.game.dragDistance + "<br>");
        this.debug.append("Zoom Factor   : " + this.currentZoom + "<br>");
        if (this.game.ship) {
            this.debug.append("<br><em>Ship</em><br>");
            this.debug.append("Pos X   : " + Math.round(this.game.ship.pos.x) + "<br>");
            this.debug.append("Pos Y   : " + Math.round(this.game.ship.pos.y) + "<br>");
            this.debug.append("Orientation   : " + Math.round(this.game.ship.orientation) + "<br>");
            this.debug.append("Speed Actual   : " + Math.round(this.game.ship.speed_actual) + "<br>");
            this.debug.append("Speed Requested  : " + Math.round(this.game.speed) + "<br>");
            this.debug.append("Rudder Actual  : " + Math.round(this.game.ship.rudderAngleActual) + "<br>");
            this.debug.append("Rudder Requested  : " + Math.round(this.game.rudderPosition) + "<br>");
            this.debug.append("Gun Vertical Actual   : " + Math.round(this.game.ship.gun.angleVerticalActual) + "<br>");
            this.debug.append("Gun Vertical Requested   : " + Math.round(this.game.gunAngleVertical) + "<br>");
            this.debug.append("Gun Horizontal Actual   : " + Math.round(this.game.ship.gun.angleHorizontalActual) + "<br>");
            this.debug.append("Gun Horizontal Requested   : " + Math.round(this.game.gunAngleHorizontal) + "<br>");
            this.debug.append("Winkel zum Cursor   : " + Math.round(Util.radiansToDegrees(Math.atan2(this.game.cursorWorld.y - this.game.ship.pos.y, this.game.cursorWorld.x - this.game.ship.pos.x))) + "<br>");
            if (this.game.waypoint) {
                this.debug.append("Winkel zum Waypoint   : " + Math.round(this.game.angleToWaypoint) + "<br>");
            }
        }

        if (this.game.shells[0]) {
            this.debug.append("<br><em>Shell</em><br>");
            this.debug.append("shell.x   : " + Math.round(this.game.shells[0].pos.x) + "<br>");
            this.debug.append("shell.y   : " + Math.round(this.game.shells[0].pos.y) + "<br>");
            this.debug.append("shell.z   : " + Math.round(this.game.shells[0].pos.z) + "<br>");
        }
    }

    zoomIn() {
        this.zoom(this.zoomFactor);
    }

    zoomOut() {
        this.zoom(1 / this.zoomFactor);
    }

    zoomReset() {
        const factor = 1 / this.currentZoom;
        this.zoom(factor);
    }

    zoom(factor: number) {
        const newZoom = this.currentZoom * factor;
        if (newZoom <= config.zoom_max && newZoom >= config.zoom_min) {
            this.currentZoom *= factor;
            this.drawWidth = Math.floor(this.canvasWidth / this.currentZoom);
            this.drawHeight = Math.floor(this.canvasHeight / this.currentZoom);
            this.deadzone.x = this.drawWidth / 2 - (50 / this.currentZoom);
            this.deadzone.y = this.drawHeight / 2 - (50 / this.currentZoom);
            if (this.ctxm) {
                this.ctxm.scale(factor, factor);
            }
            if (this.ctxf) {
                this.ctxf.scale(factor, factor);
            }

            if (this.ctxe) {
                this.ctxe.scale(factor, factor);
            }

            this.shouldRedrawMap = true;
            // this.camera.pos.x += ((this.input.posCursorCanvas.x) * factor);
            // this.camera.pos.y += ((this.input.posCursorCanvas.y) * factor);
            // }
        }
    }

    switchFollowMode() {
        this.isFollowing = !this.isFollowing;
    }

};
declare const config;