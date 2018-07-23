/**
 * Created by Jannik on 04.09.2016.
 */
import * as $ from "./lib/jquery-3.1.1.min";
import Game from "./game";
import * as Util from "./util/util";

export default class Renderer {

    private game: Game;

    private canvas_map = $("#canvas-map");
    private canvas_fow = $("#canvas-fow");
    private canvas_entities = $("#canvas-entities");
    private container = $("#canvas-container");

    private context_map: CanvasRenderingContext2D;
    private context_fow: CanvasRenderingContext2D;
    private context_entities: CanvasRenderingContext2D;

    private canvasWidth: number;
    private canvasHeight: number;

    private drawWidth: number;
    private drawHeight: number;

    private zoomFactor: number = 2;

    public currentZoom: number = 1;
    private debug = $("#debug");

    private deadzone: { x, y } = { x: this.canvasWidth / 2 - (50 / this.currentZoom), y: this.canvasHeight / 2 - (50 / this.currentZoom) };
    public cameraPos = { x: 0, y: 0 };
    public cameraPosFollow: { x, y } = { x: 0, y: 0 };

    private cursorCanvasLast: { x, y } = { x: 0, y: 0 };
    public isFollowing: boolean = false;
    public isDragging: boolean = false;

    public shouldRedrawMap: boolean = true;

    constructor(game: Game) {
        this.game = game;

        this.canvas_map[0].width = this.container.width();
        this.canvas_map[0].height = this.container.height();

        this.canvas_fow[0].width = this.container.width();
        this.canvas_fow[0].height = this.container.height();

        this.canvas_entities[0].width = this.container.width();
        this.canvas_entities[0].height = this.container.height();

        if (this.canvas_map.length > 0) {
            this.context_map = this.canvas_map[0].getContext("2d");
        }

        if (this.canvas_fow.length > 0) {
            this.context_fow = this.canvas_fow[0].getContext("2d");
        }

        if (this.canvas_entities.length > 0) {
            this.context_entities = this.canvas_entities[0].getContext("2d");
        }

        this.canvasWidth = this.canvas_entities[0].width;
        this.canvasHeight = this.canvas_entities[0].height;

        this.drawWidth = this.canvasWidth;
        this.drawHeight = this.canvasHeight;
    }

    //#region Cycle
    draw() {

        this.updateCamera();

        if (this.shouldRedrawMap) {
            this.drawMap();
        }

        if (config.fow) {
            this.drawFow();
        }

        this.drawEntities();

        if (config.log_level === "debug") {
            this.drawDebug();
        }
    }

    updateCamera() {
        // if (this.isFollowing) {
        //     const activeUnit = this.game.units_owned[this.game.selection[0]];
        //     if (activeUnit) {
        //         this.cameraPosFollow = activeUnit.pos;
        //     }

        //     if (this.cameraPosFollow) {
        //         if (this.cameraPosFollow.x - this.cameraPos.x + this.deadzone.x > this.drawWidth) {
        //             this.cameraPos.x = Math.round(this.cameraPosFollow.x - (this.drawWidth - this.deadzone.x));
        //         } else if (this.cameraPosFollow.x - this.deadzone.x < this.cameraPos.x) {
        //             this.cameraPos.x = Math.round(this.cameraPosFollow.x - this.deadzone.x);
        //         }

        //         if (this.cameraPosFollow.y - this.cameraPos.y + this.deadzone.y > this.drawHeight) {
        //             this.cameraPos.y = Math.round(this.cameraPosFollow.y - (this.drawHeight - this.deadzone.y));
        //         } else if (this.cameraPosFollow.y - this.deadzone.y < this.cameraPos.y) {
        //             this.cameraPos.y = Math.round(this.cameraPosFollow.y - this.deadzone.y);
        //         }
        //         this.shouldRedrawMap = true;
        //     }
        // }

        if (this.isDragging) {
            this.cameraPos.x -= Math.round((this.game.cursorCanvas.x - this.cursorCanvasLast.x) / this.currentZoom);
            this.cameraPos.y -= Math.round((this.game.cursorCanvas.y - this.cursorCanvasLast.y) / this.currentZoom);
            this.shouldRedrawMap = true;
        }

        this.cursorCanvasLast.x = this.game.cursorCanvas.x;
        this.cursorCanvasLast.y = this.game.cursorCanvas.y;
    }

    drawEntities() {
        if (this.canvas_entities.length > 0) {
            this.context_entities.clearRect(0, 0, this.drawWidth, this.drawHeight);

            for (let i = 0; i < this.game.ships.length; i++) {
                this.context_entities.save();
                
                this.context_entities.translate(-this.cameraPos.x, -this.cameraPos.y); //TODO: kann das nicht schon vorher an eine andere Stelle?
                // const pX = ship.pos.x - this.cameraPos.x;
                // const pY = ship.pos.y - this.cameraPos.y;

                const ship = this.game.ships[i];
                const isMine:boolean = ship.owner === this.game.socket.id;

                //draw the ship
                const width: number = 20; //TODO: width und height vom Server übernehmen
                const height: number = 10;
                const rad:number = Util.degreeToRadians(ship.orientation);
                this.context_entities.fillStyle = isMine ? "pink" : "red";
                this.context_entities.translate(ship.pos.x + width / 2, ship.pos.y + height / 2);
                this.context_entities.rotate(rad); 
                this.context_entities.fillRect(width / 2 * (-1), height / 2 * (-1), width, height);

                //draw the gun
                const widthGun: number = 12; //TODO: width und height vom Server übernehmen
                const heightGun: number = 2;
                const offsetGun: number = 10;
                const radGun = ship.gun.angleHorizontalActual * Math.PI / 180;
                this.context_entities.fillStyle = "black";
                this.context_entities.rotate(radGun);
                this.context_entities.fillRect(widthGun + offsetGun / 2 * (-1), heightGun / 2 * (-1), widthGun, heightGun);

                //draw the helper line
                const lengthHelper: number = 900;
                const thicknessHelper: number = 2;
                const offsetHelper: number = 30;
                this.context_entities.beginPath();
                this.context_entities.setLineDash([5, 15]);
                this.context_entities.strokeStyle = "yellow";
                this.context_entities.lineWidth = thicknessHelper;
                this.context_entities.moveTo(offsetHelper, 0);
                this.context_entities.lineTo(lengthHelper, 0);
                // this.context_entities.lineTo(0 + lengthHelper * Math.cos(radGun), 0 + lengthHelper * Math.sin(radGun));
                this.context_entities.stroke();
                this.context_entities.closePath();

                //reset the canvas  
                this.context_entities.restore();
            }

            this.context_entities.fillStyle = "yellow";
            for (let i = 0; i < this.game.shells.length; i++) {
                const shell = this.game.shells[i];
                this.context_entities.beginPath();
                const pX = shell.pos.x - this.cameraPos.x;
                const pY = shell.pos.y - this.cameraPos.y;
                this.context_entities.arc(pX, pY, 10, 0, 2 * Math.PI);
                this.context_entities.fill();
            }
        }
    }

    drawMap() {
        // Clear Canvas
        // this.context_map.clearRect(0, 0, this.drawWidth, this.drawHeight);

        // //Draw Tiles
        // const minX: number = Math.floor(this.cameraPos.x / this.game.tileSize);
        // const maxX: number = Math.ceil(minX + this.drawWidth / this.game.tileSize);
        // const minY: number = Math.floor(this.cameraPos.y / this.game.tileSize);
        // const maxY: number = Math.ceil(minY + this.drawHeight / this.game.tileSize);

        // for (let x = minX; x <= maxX; x++) {
        //     for (let y = minY; y <= maxY; y++) {
        //         const wrappedX = Util.mod(x, this.game.size);
        //         const wrappedY = Util.mod(y, this.game.size);
        //         const tile = this.game.tileCache[wrappedX][wrappedY];
        //         if (tile) {
        //             this.context_map.fillStyle = tile.color;
        //             const tX = Util.mod((wrappedX * this.game.tileSize) - this.cameraPos.x, this.game.worldSize);
        //             const tY = Util.mod((wrappedY * this.game.tileSize) - this.cameraPos.y, this.game.worldSize);

        //             this.context_map.fillRect(tX, tY, this.game.tileSize, this.game.tileSize);
        //         }
        //     }
        // }
        // this.shouldRedrawMap = false;
    }

    drawFow() {
        // if (this.canvas_fow.length > 0) {
        //     this.context_fow.clearRect(0, 0, this.drawWidth, this.drawHeight);
        //     this.context_fow.fillStyle = "rgba(0, 0, 0, 0.2)";
        //     this.context_fow.fillRect(0, 0, this.drawWidth, this.drawHeight);

        //     for (let id in this.game.units_owned) {
        //         const unit = this.game.units_owned[id];
        //         const distance = unit.visibility * this.game.tileSize;
        //         const pX = Util.mod(unit.pos.x - this.cameraPos.x, this.game.worldSize);
        //         const pY = Util.mod(unit.pos.y - this.cameraPos.y, this.game.worldSize);
        //         this.context_fow.save();
        //         this.context_fow.beginPath();
        //         this.context_fow.arc(pX, pY, distance, 0, 2 * Math.PI);
        //         this.context_fow.clip();
        //         this.context_fow.clearRect(0, 0, this.drawWidth, this.drawHeight);
        //         this.context_fow.restore();
        //     }
        // }
    }

    drawDebug() {
        this.debug.text("");
        if (this.isFollowing) {
            this.debug.append("cameraPosFollow.pos.x   : " + this.cameraPosFollow.x + "<br>");
            this.debug.append("cameraPosFollow.pos.y   : " + this.cameraPosFollow.y + "<br>");
        }
        this.debug.append("camera.x   : " + this.cameraPos.x + "<br>");
        this.debug.append("camera.y   : " + this.cameraPos.y + "<br>");
        this.debug.append("deadz.x   : " + this.deadzone.x + "<br>");
        this.debug.append("deadz.y   : " + this.deadzone.y + "<br>");
        this.debug.append("drawwidth.x   : " + this.drawWidth + "<br>");
        this.debug.append("drawwidth.y   : " + this.drawHeight + "<br>");
        // this.debug.append("worldsize.x   : " + this.game.size + "<br>");
        // this.debug.append("worldsize.y   : " + this.game.size + "<br>");
        this.debug.append("cursor.x   : " + this.game.cursorWorld.x + "<br>");
        this.debug.append("cursor.y   : " + this.game.cursorWorld.y + "<br>");
        this.debug.append("canvas.x   : " + this.canvasWidth + "<br>");
        this.debug.append("canvas.y   : " + this.canvasHeight + "<br>");
        this.debug.append("zoom   : " + this.currentZoom + "<br>");

        let myShip;
        for (let i = 0; i < this.game.ships.length; i++) {
            let ship = this.game.ships[i];
            if (ship.owner === this.game.socket.id) {
                myShip = ship;
            }
        }

        if (myShip) {
            this.debug.append("pos.x   : " + myShip.pos.x + "<br>");
            this.debug.append("pos.y   : " + myShip.pos.y + "<br>");
            this.debug.append("orientation   : " + myShip.orientation + "<br>");
        }
        if (this.game.shells[0]) {
            this.debug.append("shell.x   : " + this.game.shells[0].pos.x + "<br>");
            this.debug.append("shell.y   : " + this.game.shells[0].pos.y + "<br>");
            this.debug.append("shell.z   : " + this.game.shells[0].pos.z + "<br>");
        }
        this.debug.append("speed   : " + this.game.speed + "<br>");
        this.debug.append("speed   : " + this.game.speed + "<br>");
        this.debug.append("rudder   : " + this.game.rudderPosition + "<br>");
        this.debug.append("gun vert   : " + this.game.gunAngleVertical + "<br>");
        this.debug.append("gun hori   : " + this.game.gunAngleHorizontal + "<br>");
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
        //Limit the zoomlevel to a relative max/min
        // if ((!(this.canvasWidth / (this.currentZoom * factor) > this.game.worldSize) && !(this.canvasHeight / (this.currentZoom * factor) > this.game.worldSize)) &&
        //     (!(this.canvasWidth / (this.currentZoom * factor) < this.canvasWidth / 40) && !(this.canvasHeight / (this.currentZoom * factor) < this.canvasHeight / 40))) {
        this.currentZoom *= factor;
        this.drawWidth = Math.floor(this.canvasWidth / this.currentZoom);
        this.drawHeight = Math.floor(this.canvasHeight / this.currentZoom);
        this.deadzone.x = this.drawWidth / 2 - (50 / this.currentZoom);
        this.deadzone.y = this.drawHeight / 2 - (50 / this.currentZoom);
        // if (this.context_map) {
        //     this.context_map.scale(factor, factor);
        // }
        // if (this.context_fow) {
        //     this.context_fow.scale(factor, factor);
        // }

        if (this.context_entities) {
            this.context_entities.scale(factor, factor);
        }

        this.shouldRedrawMap = true;
        // this.camera.pos.x += ((this.input.posCursorCanvas.x) * factor);
        // this.camera.pos.y += ((this.input.posCursorCanvas.y) * factor);
        // }
    }

    switchFollowMode() {
        this.isFollowing = !this.isFollowing;
    }

};
declare const config;