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

            this.drawShip(this.game.ship, true);

            for (let i = 0; i < this.game.ships.length; i++) {
                this.drawShip(this.game.ships[i], false);
            }

            for (let i = 0; i < this.game.shells.length; i++) {
                const shell = this.game.shells[i];
                //Shell zeichnen
                this.context_entities.beginPath();
                this.context_entities.fillStyle = "yellow";
                const pX = shell.pos.x - this.cameraPos.x;
                const pY = shell.pos.y - this.cameraPos.y;
                const pYZ = shell.pos.y - shell.pos.z - this.cameraPos.y;
                this.context_entities.arc(pX, pYZ, 3, 0, 2 * Math.PI);
                this.context_entities.fill();
                this.context_entities.closePath();
                //"Schatten" zeichnen
                const shadowSize = Math.max(3 * (1 - shell.pos.z / 500), 0.5); //Diese Zeile kommt von Louis
                this.context_entities.beginPath();
                this.context_entities.fillStyle = "gray";
                this.context_entities.arc(pX, pY, shadowSize, 0, 2 * Math.PI);
                this.context_entities.fill();
                this.context_entities.closePath();
            }
        }
    }

    drawShip(ship, isMine) {
        if (ship) {
            this.context_entities.save();

            this.context_entities.translate(-this.cameraPos.x, -this.cameraPos.y); //TODO: kann das nicht schon vorher an eine andere Stelle?
            // const pX = ship.pos.x - this.cameraPos.x;
            // const pY = ship.pos.y - this.cameraPos.y;
            //Draw aimpoint
            if(this.game.aimPoint) {
                this.context_entities.beginPath();
                this.context_entities.strokeStyle = "green";
                this.context_entities.lineWidth = 1;
                this.context_entities.setLineDash([]);
                this.context_entities.arc(this.game.aimPoint.x, this.game.aimPoint.y, 10, 0, 2 * Math.PI);
                this.context_entities.arc(this.game.aimPoint.x, this.game.aimPoint.y, 15, 0, 2 * Math.PI);
                this.context_entities.arc(this.game.aimPoint.x, this.game.aimPoint.y, 20, 0, 2 * Math.PI);
                this.context_entities.stroke();
            }

            //draw the ship
            const width: number = ship.width; //TODO: width und height vom Server übernehmen
            const height: number = ship.height;
            const rad: number = Util.degreeToRadians(ship.orientation);

            if (ship.teamId === 0) {
                this.context_entities.fillStyle = isMine ? "pink" : "red";
            } else if (ship.teamId === 1) {
                this.context_entities.fillStyle = isMine ? "green" : "darkgreen";
            }

            this.context_entities.translate(ship.pos.x + width / 2, ship.pos.y + height / 2);
            this.context_entities.rotate(rad);
            this.context_entities.fillRect(width / 2 * (-1), height / 2 * (-1), width, height);

            //draw the gun
            const widthGun: number = 12; //TODO: width und height vom Server übernehmen
            const heightGun: number = 2;
            const offsetGun: number = 10;
            const radGunActual = Util.degreeToRadians(ship.gun.angleHorizontalActual);
            this.context_entities.fillStyle = "black";
            this.context_entities.rotate(radGunActual);
            this.context_entities.fillRect(widthGun + offsetGun / 2 * (-1), heightGun / 2 * (-1), widthGun, heightGun);

            if (isMine) {

                //draw the helper line
                const lengthHelper: number = 900;
                const thicknessHelper: number = 2;
                const offsetHelper: number = 30;
                this.context_entities.setLineDash([5, 15]);
                this.context_entities.strokeStyle = "yellow";
                this.context_entities.lineWidth = thicknessHelper;
                this.context_entities.beginPath();
                this.context_entities.moveTo(offsetHelper, 0);
                this.context_entities.lineTo(lengthHelper, 0);
                this.context_entities.stroke();
                this.context_entities.closePath();

                const radGunReq = Util.degreeToRadians(ship.gun.angleHorizontalRequested);
                this.context_entities.rotate(-radGunActual);
                this.context_entities.rotate(radGunReq);
                this.context_entities.strokeStyle = "grey";
                this.context_entities.beginPath();
                this.context_entities.moveTo(offsetHelper, 0);
                this.context_entities.lineTo(lengthHelper, 0);
                this.context_entities.stroke();
                this.context_entities.closePath();

                                
            }
            //reset the canvas  
            this.context_entities.restore();
        }
    }

    drawMap() {
        //Clear Canvas
        this.context_entities.save();
        // this.context_entities.translate(-this.cameraPos.x, -this.cameraPos.y); //TODO: kann das nicht schon vorher an eine andere Stelle?
        this.context_map.clearRect(0, 0, this.drawWidth, this.drawHeight);
        this.context_map.fillStyle = "darkblue";
        this.context_map.fillRect(-this.cameraPos.x, -this.cameraPos.y, this.game.mapWidth, this.game.mapHeight);
        this.context_entities.restore();

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
        //Limit the zoomlevel to a relative max/min
        // if ((!(this.canvasWidth / (this.currentZoom * factor) > this.game.worldSize) && !(this.canvasHeight / (this.currentZoom * factor) > this.game.worldSize)) &&
        //     (!(this.canvasWidth / (this.currentZoom * factor) < this.canvasWidth / 40) && !(this.canvasHeight / (this.currentZoom * factor) < this.canvasHeight / 40))) {
        if(newZoom <= config.zoom_max && newZoom >= config.zoom_min) {
            this.currentZoom *= factor;
            this.drawWidth = Math.floor(this.canvasWidth / this.currentZoom);
            this.drawHeight = Math.floor(this.canvasHeight / this.currentZoom);
            this.deadzone.x = this.drawWidth / 2 - (50 / this.currentZoom);
            this.deadzone.y = this.drawHeight / 2 - (50 / this.currentZoom);
            if (this.context_map) {
                this.context_map.scale(factor, factor);
            }
            if (this.context_fow) {
                this.context_fow.scale(factor, factor);
            }
    
            if (this.context_entities) {
                this.context_entities.scale(factor, factor);
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