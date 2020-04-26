/**
 * Created by Jannik on 04.09.2016.
 */
import Vector2 from "../../shared/vector2";
import Maphelper, { MaphelperListener } from "./maphelper";
import Hex, { Layout } from "../../shared/hex";
import { InputListener } from "./input";
import ClientWorld from "./clientworld";

export default class Renderer implements InputListener, MaphelperListener {
    onImagesLoaded() {
        this.shouldRedrawMap = true;
    }
    
    private canvas_map;
    private canvas_fow;
    private canvas_entities;
    private div_container;
    private div_debug;

    private ctxm: any;
    private ctxf: any;
    private ctxe: any;

    private canvasWidth: number;
    private canvasHeight: number;

    private drawWidth: number;
    private drawHeight: number;

    private layout:Layout;

    //Variablen die durch Listener gesetzt werden
    private selectedHex: Hex;
    private cameraPosition: Vector2 = new Vector2();


    private deadzone: Vector2 = new Vector2();
    private shouldDrawDebug: boolean = config.log_level === "debug";

    private shouldRedrawMap:boolean = true;

    constructor(div_container, canvas_map, canvas_fow, canvas_entities, div_debug, layout) {
        this.div_container = div_container;
        this.div_debug = div_debug;
        this.canvas_map = canvas_map;
        this.canvas_fow = canvas_fow;
        this.canvas_entities = canvas_entities;
        this.layout = layout;

        Maphelper.loadImages(this);

        this.canvasWidth = this.div_container.width();
        this.canvasHeight = this.div_container.height();
        this.drawWidth = this.canvasWidth;
        this.drawHeight = this.canvasHeight;

        this.canvas_map[0].width = this.canvasWidth;
        this.canvas_map[0].height = this.canvasHeight;

        this.canvas_fow[0].width = this.canvasWidth;
        this.canvas_fow[0].height = this.canvasHeight;

        this.canvas_entities[0].width = this.canvasWidth;
        this.canvas_entities[0].height = this.canvasHeight;

        if (this.canvas_map.length > 0) {
            this.ctxm = this.canvas_map[0].getContext("2d");
        }

        if (this.canvas_fow.length > 0) {
            this.ctxf = this.canvas_fow[0].getContext("2d");
        }

        if (this.canvas_entities.length > 0) {
            this.ctxe = this.canvas_entities[0].getContext("2d");
        }

        this.updateDebug()
    }

    //#region Cycle
    draw(world:ClientWorld) {
        this.ctxm.save();
        this.ctxf.save();
        this.ctxe.save();

        this.ctxe.clearRect(0, 0, this.drawWidth, this.drawHeight);

        if(this.shouldRedrawMap) {
            this.shouldRedrawMap = false;
            this.ctxm.clearRect(0, 0, this.drawWidth, this.drawHeight);
            this.ctxm.translate(-this.cameraPosition.x, -this.cameraPosition.y);
            this.drawMap(world);
        }

        if (config.fow) {
            this.ctxf.translate(-this.cameraPosition.x, -this.cameraPosition.y);
            this.drawFow();
        }

        this.ctxe.translate(-this.cameraPosition.x, -this.cameraPosition.y);
        this.drawEntities(world);

        if (this.shouldDrawDebug) {
            this.drawDebug();
        }

        this.ctxm.restore();
        this.ctxf.restore();
        this.ctxe.restore();
    }

    

    drawEntities(world) {
        this.ctxe.save();
        if(world) {
            if(world.armies) {
                for(let i = 0; i < world.armies.length; i++) {
                    let unit = world.armies[i];
                    if(unit) {
                        this.ctxe.font = "30px Arial";
                        this.ctxe.fillStyle = "red";
                        this.ctxe.textAlign = "center";
                        this.ctxe.fillText(unit.id+ " ("+Math.round(unit.movementStatus)+")", this.layout.hexToPixel(unit.pos).x,this.layout.hexToPixel(unit.pos).y)
                    }
                }
            }            
        }
        this.ctxe.restore();
    }

    drawMap(world) {
        this.ctxm.save();
        if (world) {
            let keys = Object.keys(world.tiles);
            for(let key of keys) {
                let tile = world.tiles[key];
                this.drawTile(tile);
            }

            if (this.selectedHex) {
                this.ctxm.filter = "brightness(110%) contrast(1.05) drop-shadow(0px 0px 25px black)";
                this.drawTile(world.tiles[this.selectedHex.hash()]); //Draw the selected Tile again, so that the filter applies.
                this.ctxm.filter = "none";
            }
        }
        this.ctxm.restore();
    }

    drawTile(tile) {
        if (tile) {
            this.ctxm.save();
            let hex = tile.hex;
            let corners = this.layout.polygonCorners(hex);
            let padding = 10;

            if(this.selectedHex && this.selectedHex.equals(tile.hex)) {
                this.ctxm.filter = "brightness(110%) contrast(1.05) drop-shadow(0px 0px 25px black)";
            }
            this.ctxm.drawImage(
                Maphelper.getTerrainImage(tile.height),
                corners[3].x + padding, //obere linke ecke
                corners[3].y - this.layout.size.y / 2 + padding, //obere linke ecke- halbe höhe
                this.layout.size.x * Math.sqrt(3) - padding, //radius mal wurzel aus 3 um die reale breite des hex zu errechnen
                this.layout.size.y * 2 - padding);//radius mal 2 um die reale höhe des hex zu errechnen
            
            this.ctxm.filter = "none";

            for (let i = 0; i < tile.environmentSpots.length; i++) {
                let spot = tile.environmentSpots[i];
                let img = Maphelper.getSprite(spot);
                let pos = spot.pos;
                this.ctxm.drawImage(img,
                    this.layout.hexToPixel(hex).x + pos.x,
                    this.layout.hexToPixel(hex).y + pos.y);
            }

            this.ctxm.restore();
        }
    }
    drawFow() {
        //no fow yet
    }

    drawDebug() {
        this.div_debug.text("");
        this.div_debug.append("<em>General Information</em><br>");
        this.div_debug.append("UID   : " + currentUid + "<br>");
        this.div_debug.append("Camera.x   : " + this.cameraPosition.x + "<br>");
        this.div_debug.append("Camera.y   : " + this.cameraPosition.y + "<br>");
        this.div_debug.append("Canvas Width   : " + this.canvasWidth + "<br>");
        this.div_debug.append("Canvas Height   : " + this.canvasHeight + "<br>");
        this.div_debug.append("Draw Width   : " + this.drawWidth + "<br>");
        this.div_debug.append("Draw Height   : " + this.drawHeight + "<br>");
        //this.div_debug.append("Cursor Position X   : " + this.game.cursorWorld.x + "<br>");
        //this.div_debug.append("Cursor Position Y   : " + this.game.cursorWorld.y + "<br>");
        //this.div_debug.append("Cursor Canvas Position X   : " + this.game.cursorCanvas.x + "<br>");
        //this.div_debug.append("Cursor Canvas Position Y   : " + this.game.cursorCanvas.y + "<br>");
        if (this.selectedHex) this.div_debug.append("Selected Hex   : " + this.selectedHex.q + " " + this.selectedHex.r + " " + this.selectedHex.s + "<br>");
        //this.div_debug.append("Zoom Factor   : " + this.currentZoom + "<br>");
    }


    toggleDebug() {
        this.shouldDrawDebug = !this.shouldDrawDebug;
        this.updateDebug();
    }
    updateDebug() {
        if (this.shouldDrawDebug) {
            this.div_debug.show();
        } else {
            this.div_debug.hide();
        }
    }

    public requestRedraw() {
        this.shouldRedrawMap = true;
    }

    //Inputlistener
    onKeyUp(event: KeyboardEvent) {
        switch (event.keyCode) {
            case 80: this.toggleDebug(); break;//#
            //case 32: this.socket.emit("input shoot"); break;//# 
          }
    }
    onZoom(factor:number, currentZoom: number) {
        this.drawWidth = Math.floor(this.canvasWidth / currentZoom);
        this.drawHeight = Math.floor(this.canvasHeight / currentZoom);
        this.deadzone.x = this.drawWidth / 2 - (50 / currentZoom);
        this.deadzone.y = this.drawHeight / 2 - (50 / currentZoom);

        if (this.ctxm) {
            this.ctxm.scale(factor, factor);
        }
        if (this.ctxf) {
            this.ctxf.scale(factor, factor);
        }
        if (this.ctxe) {
            this.ctxe.scale(factor, factor);
        }

        this.cameraPosition.x -= -(factor - 1) * this.drawWidth/2;
        this.cameraPosition.y -= -(factor - 1) * this.drawHeight/2;

        this.shouldRedrawMap = true;
    }
    onRightClick(cursorCanvas: Vector2, cursorWorld: Vector2) {
        throw new Error("Method not implemented.");
    }
    onLeftClick(cursorCanvas: Vector2, cursorWorld: Vector2) {
        throw new Error("Method not implemented.");
    }
    onKeyDown(event: KeyboardEvent) {
        throw new Error("Method not implemented.");
    }
    onCameraPosition(cameraPos: Vector2) {
        this.cameraPosition = cameraPos;
        this.shouldRedrawMap = true;
    }
    onHexSelected(hex:Hex) {
        this.selectedHex = hex;
        this.shouldRedrawMap = true;
    }
};
declare const config;
declare const currentUid;