/**
 * Created by Jannik on 04.09.2016.
 */
import * as $ from "./lib/jquery-3.1.1.min";
import Game from "./game";
import Vector2 from "../../shared/vector2";
import * as Util from "../../shared/util";
import Maphelper from "./maphelper";

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

    private deadzone: Vector2 = new Vector2(this.canvasWidth / 2 - (50 / this.currentZoom), this.canvasHeight / 2 - (50 / this.currentZoom));
    public cameraPos: Vector2 = new Vector2();
    public cameraPosFollow: Vector2 = new Vector2();

    private cursorCanvasLast: Vector2 = new Vector2();
    public isFollowing: boolean = false;
    public isDragging: boolean = false;
    private shouldDrawDebug: boolean = config.log_level === "debug";

    constructor(game: Game) {
        this.game = game;

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

        this.updateDebug()
    }

    //#region Cycle
    draw() {
        this.ctxm.save();
        this.ctxf.save();
        this.ctxe.save();

        this.ctxe.clearRect(0, 0, this.drawWidth, this.drawHeight);

        this.updateCamera();

        this.ctxm.clearRect(0, 0, this.drawWidth, this.drawHeight);
        this.ctxm.translate(-this.cameraPos.x, -this.cameraPos.y);
        this.drawMap();

        if (config.fow) {
            this.ctxf.translate(-this.cameraPos.x, -this.cameraPos.y);
            this.drawFow();
        }

        this.ctxe.translate(-this.cameraPos.x, -this.cameraPos.y);
        this.drawEntities();

        if (this.shouldDrawDebug) {
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
        }
        this.cursorCanvasLast.x = this.game.cursorCanvas.x;
        this.cursorCanvasLast.y = this.game.cursorCanvas.y;
    }

    drawEntities() {
        
    }

    drawMap() {
        //Clear Canvas
        this.ctxm.save();
        if(this.game.tiles) {
            Object.keys(this.game.tiles).forEach(key => { 
                let hex = this.game.tiles[key].hex;
                let height  = this.game.tiles[key].height;
                let corners = this.game.layout.polygonCorners(hex);
                
                this.ctxm.beginPath();                
                for(let i = 0; i < corners.length; i++) {
                    if(i === 0) {
                        this.ctxm.moveTo(corners[i].x, corners[i].y);
                    } else {
                        this.ctxm.lineTo(corners[i].x, corners[i].y);
                    }
                }
                this.ctxm.closePath();

                let padding = 0;
                this.ctxm.drawImage(
                    Maphelper.getTerrainImage(height),
                    corners[3].x+padding, //obere linke ecke
                    corners[3].y-this.game.layout.size.y/2+padding, //obere linke ecke- halbe höhe
                    this.game.layout.size.x*Math.sqrt(3)-padding, //radius mal wurzel aus 3 um die reale breite des hex zu errechnen
                    this.game.layout.size.y*2-padding);//radius mal 2 um die reale höhe des hex zu errechnen
                
                this.ctxm.fillStyle = "black";
                this.ctxm.fillText(""+height, corners[0].x-100, corners[0].y-50);

                if(this.game.selectedHex && this.game.selectedHex.equals(hex)) {
                    this.ctxm.strokeStyle = "white";
                    this.ctxm.lineWidth = 4
                    this.ctxm.stroke();
                }
            });
        }
        this.ctxm.restore();
        // this.shouldRedrawMap = false;
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
        this.debug.append("Canvas Width   : " + this.canvasWidth + "<br>");
        this.debug.append("Canvas Height   : " + this.canvasHeight + "<br>");
        this.debug.append("Draw Width   : " + this.drawWidth + "<br>");
        this.debug.append("Draw Height   : " + this.drawHeight + "<br>");
        this.debug.append("Cursor Position X   : " + this.game.cursorWorld.x + "<br>");
        this.debug.append("Cursor Position Y   : " + this.game.cursorWorld.y + "<br>");
        this.debug.append("Cursor Canvas Position X   : " + this.game.cursorCanvas.x + "<br>");
        this.debug.append("Cursor Canvas Position Y   : " + this.game.cursorCanvas.y + "<br>");
        if(this.game.selectedHex) this.debug.append("Selected Hex   : " + this.game.selectedHex.q+" "+this.game.selectedHex.r+" "+this.game.selectedHex.s + "<br>");
        this.debug.append("Mouse Distance   : " + this.game.dragDistance + "<br>");
        this.debug.append("Zoom Factor   : " + this.currentZoom + "<br>");
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

            // this.camera.pos.x += ((this.input.posCursorCanvas.x) * factor);
            // this.camera.pos.y += ((this.input.posCursorCanvas.y) * factor);
            // }
        }
    }

    toggleFollowMode() {
        this.isFollowing = !this.isFollowing;
    }

    toggleDebug() {
        this.shouldDrawDebug = !this.shouldDrawDebug;
        this.updateDebug();
    }
    updateDebug() {
        if (this.shouldDrawDebug) {
            this.debug.show();
        } else {
            this.debug.hide();
        }
    }

};
declare const config;
declare const currentUid;