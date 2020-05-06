import $ from 'jquery';
import Log from "./util/log";
import Vector2 from "../../shared/vector2";
import Gameloop, { GameloopListener } from "../../shared/gameloop";
import Hex, { Layout } from "../../shared/hex";
import Renderer from "./renderer";
import Input, { InputListener } from "./input";
import Connection, { ConnectionListener } from "./connection";
import { Socket } from "socket.io";
import Hud, { HudListener } from "./hud";
import { PlayerRelation } from "../../shared/gamedata";
import ClientWorld from "./clientworld";

declare const config;

export default class Game implements InputListener, ConnectionListener, HudListener, GameloopListener {
    
    private canvas_map = $("#canvas-map");
    private canvas_fow = $("#canvas-fow");
    private canvas_entities = $("#canvas-entities");
    private div_container = $("#canvas-container");
    private div_debug = $("#debug");
    private gameloop:Gameloop;
    private connection:Connection;
    private layout:Layout;
    private renderer:Renderer;
    private input:Input;
    private hud:Hud;
    private cWorld:ClientWorld = new ClientWorld();

    private selectedHex:Hex = null;
    private selectedArmies:string[] = [];

    private initialFocusSet = false;

    constructor() {
        this.gameloop = new Gameloop(Gameloop.requestAnimationFrameWrapper, config.updaterate, config.netrate)
        this.connection = new Connection(config.ip, config.transports);
        this.layout = new Layout(Layout.pointy, new Vector2(config.hex_width, config.hex_height), new Vector2(0, 0));
        this.renderer = new Renderer(this.div_container, this.canvas_map, this.canvas_fow, this.canvas_entities, this.div_debug, this.layout);
        this.input = new Input(this.canvas_entities, this.layout);
        this.hud = new Hud();

        this.hud.addListener(this);
        this.gameloop.addListener(this.input);
        this.gameloop.addListener(this);
        this.input.addListener(this.renderer);
        this.input.addListener(this);
        this.connection.addListener(this);
        this.gameloop.run();

        Log.info("Client ready");
    }

    onRender() {
        this.renderer.draw(this.cWorld);
    }

    onConstructionRequested(name: string): void {
        this.connection.send("request construction", {name: name, pos:this.selectedHex});
    }

    onUnitRequested(name: string): void {
        this.connection.send("request unit", {name: name, pos:this.selectedHex});
    }

    onUnitsSelected(uids: string[]): void {
        this.selectedArmies = uids;
    }

    onRightClick(cursorCanvas: Vector2, cursorWorld: Vector2) {
        let clickedHex = this.layout.pixelToHex(cursorWorld).round();
        if(clickedHex /*&& this.cWorld.tiles[clickedHex.hash()]*/) {
            this.connection.send("request movement", {selection:this.selectedArmies, target:clickedHex});        
        }
    }

    onLeftClick(cursorCanvas: Vector2, cursorWorld: Vector2) {
        this.selectedHex = this.layout.pixelToHex(cursorWorld).round();
        if(this.selectedHex && this.cWorld.tiles[this.selectedHex.hash()]) {
            this.hud.showSelectionHud(this.cWorld, this.selectedHex);
            this.hud.showConstructionHud(); //TODO: Only show this if you can xonstruct something here 
        } else {
            this.hud.hideConstructionHud();
            this.hud.hideSelectionHud();
        }
    }

    onConnected(socket: Socket) {
        Log.info("Connected");
    }
    onDisconnected(socket: Socket) {
        Log.info("Disonnected");
    }
    onSetup(socket: Socket) {
        //Hier alle Gamelevel Events implementieren
        socket.on("gamestate tiles", (data) => {
            for (let property in this.cWorld.tiles) {
                if (this.cWorld.tiles.hasOwnProperty(property)) {
                    this.cWorld.tiles[property].visible = false;
                }
            }
            for (let property in data) {
                if (data.hasOwnProperty(property)) {
                    data[property].visible = true;
                    this.cWorld.tiles[property] = data[property];
                }
            }
            //this.cWorld.tiles = data;
            this.renderer.requestRedraw();
        });
        socket.on("gamestate discovered tiles", (data) => {
            for (let property in data) {
                if (data.hasOwnProperty(property)) {
                    this.cWorld.tiles[property] = data[property];
                }
            }
            this.renderer.requestRedraw();
        });
        socket.on("gamestate armies", (data) => {
            this.cWorld.armies = data;
            for(let army of this.cWorld.armies) {
                if(army.owner !== currentUid) {
                    if(this.cWorld.playerRelations[PlayerRelation.getHash(army.owner, currentUid)] === undefined) {
                        this.connection.send("request relation", {id1: army.owner, id2:currentUid});
                    }
                } 
            }
            this.renderer.requestRedraw();
        });
        socket.on("gamestate battles", (data) => {
            this.cWorld.battles = data;
            this.renderer.requestRedraw();
        });
        socket.on("gamestate buildings", (data) => {
            this.cWorld.buildings = data;
            if(!this.initialFocusSet) {
                this.initialFocusSet = true;
                this.renderer.focus(this.cWorld.buildings[0].pos);
            }
            this.renderer.requestRedraw();
        });
        socket.on("gamestate relation", (data) => {
            let hash = PlayerRelation.getHash(data.id1, data.id2);
            this.cWorld.playerRelations[hash] = data;
        });
    }
}

declare const currentUid;