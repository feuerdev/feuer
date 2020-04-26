import * as $ from "./lib/jquery-3.1.1.min";
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

    onConstructionRequested(typeId: any): void {
        this.connection.send("request construction", {typeId: typeId, pos:this.input.selectedHex});
    }

    onHexSelected(hex: Hex) {
        if(this.input.selectedHex && this.cWorld.tiles[this.input.selectedHex.hash()]) {
            this.hud.showSelectionHud(this.cWorld, hex);
            this.hud.showConstructionHud(); //TODO: Only show this if you can xonstruct something here
            this.connection.send("request movement", hex);        
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
        socket.on("gamestate world", (data) => {
            this.cWorld.tiles = data.tiles;
            this.cWorld.armies = data.armies;
            for(let unit of this.cWorld.armies) {
                if(unit.owner !== currentUid) {
                    if(this.cWorld.playerRelations[PlayerRelation.getHash(unit.owner, currentUid)] === undefined) {
                        this.connection.send("request relation", {id1: unit.owner, id2:currentUid});
                    }
                } 
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