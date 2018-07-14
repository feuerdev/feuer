/**
 * Created by Jannik on 04.09.2016.
 */
import * as $ from "./lib/jquery-3.1.1.min";
// import Camera from "./camera";
// import * as Util from "./util/util";

export default class Renderer {

    // private game: Game;
    // private world: World;
    // private camera: Camera;

    private canvas_map = $("#canvas-map");
    private canvas_fow = $("#canvas-fow");
    private canvas_entities = $("#canvas-entities");

    private context_map;
    private context_fow;
    private context_entities;

    private canvasWidth: number;
    private canvasHeight: number;

    private drawWidth: number;
    private drawHeight: number;

    private zoomFactor: number = 2;

    private currentZoom: number = 1;
    private debug = $("#debug");

    constructor() {

        this.canvas_map[0].width = window.innerWidth;
        this.canvas_map[0].height = window.innerHeight;

        this.canvas_fow[0].width = window.innerWidth;
        this.canvas_fow[0].height = window.innerHeight; 

        this.canvas_entities[0].width = window.innerWidth;
        this.canvas_entities[0].height = window.innerHeight; 

        if (this.canvas_map.length > 0) {
            this.context_map = this.canvas_map[0].getContext("2d");
        }

        if (this.canvas_fow.length > 0) {
            this.context_fow = this.canvas_fow[0].getContext("2d");
        }

        if (this.canvas_entities.length > 0) {
            this.context_entities = this.canvas_entities[0].getContext("2d");
        }

        this.canvasWidth = this.canvas_map[0].width;
        this.canvasHeight = this.canvas_map[0].height;

        this.drawWidth = this.canvasWidth;
        this.drawHeight = this.canvasHeight;

        // this.game = game;
        // this.world = world;
        // this.camera = new Camera();
    }

    // draw() {
    //     const self = this;

    //     this.camera.update();

    //     if (self.game.isMapDirty) {
    //         this.drawMap();
    //     }

    //     if (self.game.settings.fow) {
    //         this.drawFow();
    //     }

    //     this.drawEntities();

    //     if (config.log_level === "debug") {
    //         this.drawDebug();
    //     }
    // }

    // drawEntities() {
    //     if (this.canvas_entities.length > 0) {
    //         this.context_entities.clearRect(0, 0, this.drawWidth, this.drawHeight);
    //         this.context_entities.fillStyle = "blue";
    //         for (let id in this.world.units_owned) {
    //             const unit = this.world.units_owned[id];
    //             this.drawUnit(unit);
    //         }
    //         this.context_entities.fillStyle = "red";
    //         for (let id in this.world.units_other) {
    //             const unit = this.world.units_other[id];
    //             this.drawUnit(unit);
    //         }
    //     }
    // }

    // drawMap() {
    //     // Clear Canvas
    //     this.context_map.clearRect(0, 0, this.drawWidth, this.drawHeight);

    //     //Draw Tiles
    //     const minX: number = Math.floor(this.camera.pos.x / this.world.tileSize);
    //     const maxX: number = Math.ceil(minX + this.drawWidth / this.world.tileSize);
    //     const minY: number = Math.floor(this.camera.pos.y / this.world.tileSize);
    //     const maxY: number = Math.ceil(minY + this.drawHeight / this.world.tileSize);

    //     for (let x = minX; x <= maxX; x++) {
    //         for (let y = minY; y <= maxY; y++) {
    //             const wrappedX = Util.mod(x, this.world.size);
    //             const wrappedY = Util.mod(y, this.world.size);
    //             const tile = this.world.tileCache[wrappedX][wrappedY];
    //             if (tile) {
    //                 this.context_map.fillStyle = tile.color;
    //                 const tX = Util.mod((wrappedX * this.world.tileSize) - this.camera.pos.x, this.world.worldSize);
    //                 const tY = Util.mod((wrappedY * this.world.tileSize) - this.camera.pos.y, this.world.worldSize);

    //                 this.context_map.fillRect(tX, tY, this.world.tileSize, this.world.tileSize);
    //             }
    //         }
    //     }
    //     this.game.isMapDirty = false;
    // }

    // drawFow() {
    //     if (this.canvas_fow.length > 0) {
    //         this.context_fow.clearRect(0, 0, this.drawWidth, this.drawHeight);
    //         this.context_fow.fillStyle = "rgba(0, 0, 0, 0.2)";
    //         this.context_fow.fillRect(0, 0, this.drawWidth, this.drawHeight);

    //         for (let id in this.world.units_owned) {
    //             const unit = this.world.units_owned[id];
    //             const distance = unit.visibility * this.world.tileSize;
    //             const pX = Util.mod(unit.pos.x - this.camera.pos.x, this.world.worldSize);
    //             const pY = Util.mod(unit.pos.y - this.camera.pos.y, this.world.worldSize);
    //             this.context_fow.save();
    //             this.context_fow.beginPath();
    //             this.context_fow.arc(pX, pY, distance, 0, 2 * Math.PI);
    //             this.context_fow.clip();
    //             this.context_fow.clearRect(0, 0, this.drawWidth, this.drawHeight);
    //             this.context_fow.restore();
    //         }
    //     }
    // }

    // drawUnit(unit) {
    //     this.context_entities.beginPath();
    //     const pX = Util.mod(unit.pos.x - this.camera.pos.x, this.world.worldSize);
    //     const pY = Util.mod(unit.pos.y - this.camera.pos.y, this.world.worldSize);
    //     this.context_entities.arc(pX, pY, 1, 0, 2 * Math.PI);
    //     this.context_entities.fill();
    // }

    // drawDebug() {
    //     this.debug.text("");
    //     if (this.camera.isFollowing) {
    //         this.debug.append("posFollow.pos.x   : " + this.camera.posFollow.x + "<br>");
    //         this.debug.append("posFollow.pos.y   : " + this.camera.posFollow.y + "<br>");
    //     }
    //     this.debug.append("camera.x   : " + this.camera.pos.x + "<br>");
    //     this.debug.append("camera.y   : " + this.camera.pos.y + "<br>");
    //     this.debug.append("deadz.x   : " + this.camera.deadzone.x + "<br>");
    //     this.debug.append("deadz.y   : " + this.camera.deadzone.y + "<br>");
    //     this.debug.append("drawwidth.x   : " + this.drawWidth + "<br>");
    //     this.debug.append("drawwidth.y   : " + this.drawHeight + "<br>");
    //     this.debug.append("worldsize.x   : " + this.world.size + "<br>");
    //     this.debug.append("worldsize.y   : " + this.world.size + "<br>");
    //     this.debug.append("cursor.x   : " + this.game.cursorWorld.x + "<br>");
    //     this.debug.append("cursor.y   : " + this.game.cursorWorld.y + "<br>");
    //     this.debug.append("canvas.x   : " + this.canvasWidth + "<br>");
    //     this.debug.append("canvas.y   : " + this.canvasHeight + "<br>");
    //     this.debug.append("zoom   : " + this.currentZoom + "<br>");
    // }

    // zoomIn() {
    //     this.zoom(this.zoomFactor);
    // }

    // zoomOut() {
    //     this.zoom(1 / this.zoomFactor);
    // }

    // zoomReset() {
    //     const factor = 1 / this.currentZoom;
    //     this.zoom(factor);
    // }

    // zoom(factor: number) {
    //     //Limit the zoomlevel to a relative max/min
    //     if ((!(this.canvasWidth / (this.currentZoom * factor) > this.world.worldSize) && !(this.canvasHeight / (this.currentZoom * factor) > this.world.worldSize)) &&
    //         (!(this.canvasWidth / (this.currentZoom * factor) < this.canvasWidth / 40) && !(this.canvasHeight / (this.currentZoom * factor) < this.canvasHeight / 40))) {
    //         this.currentZoom *= factor;
    //         this.drawWidth = Math.floor(this.canvasWidth / this.currentZoom);
    //         this.drawHeight = Math.floor(this.canvasHeight / this.currentZoom);
    //         this.camera.deadzone.x = this.drawWidth / 2 - (50 / this.currentZoom);
    //         this.camera.deadzone.y = this.drawHeight / 2 - (50 / this.currentZoom);
    //         if (this.context_map) {
    //             this.context_map.scale(factor, factor);
    //         }
    //         if (this.context_fow) {
    //             this.context_fow.scale(factor, factor);
    //         }

    //         if (this.context_entities) {
    //             this.context_entities.scale(factor, factor);
    //         }

    //         this.game.isMapDirty = true;
    //         // this.camera.pos.x += ((this.input.posCursorCanvas.x) * factor);
    //         // this.camera.pos.y += ((this.input.posCursorCanvas.y) * factor);
    //     }
    // }
};