import $ from 'jquery';
import Log from "./util/log";
import Vector2 from "../../shared/vector2";
import Gameloop, { GameloopListener } from "../../shared/gameloop";
import Hex, { Layout } from "../../shared/hex";
// import Renderer from "./renderer";
import Input, { InputListener } from "./input";
import Connection, { ConnectionListener } from "./connection";
import { Socket } from "socket.io";
import Hud, { HudListener } from "./hud";
import PlayerRelation from "../../shared/relation";
import ClientWorld from "./clientworld";
import * as Rules from "../../shared/rules.json";
import * as PIXI from "pixi.js";

declare const config;

export default class Game implements InputListener, ConnectionListener, HudListener, GameloopListener {

    private canvas_map = $("#canvas-map");
    private div_container = $("#canvas-container");
    private div_debug = $("#debug");
    private gameloop: Gameloop;
    private connection: Connection;
    private layout: Layout;
    // private renderer:Renderer;
    private input: Input;
    private hud: Hud;
    private cWorld: ClientWorld = new ClientWorld();

    private loader: PIXI.Loader;
    private p_renderer: PIXI.Renderer;

    private selectedHex: Hex = null;
    private selectedArmies: string[] = [];

    private initialFocusSet = false;

    private loaderready = false;
    private alreadydrawn = false;

    constructor() {
        this.gameloop = new Gameloop(Gameloop.requestAnimationFrameWrapper, config.updaterate, config.netrate)
        this.connection = new Connection(config.ip, config.transports);
        this.layout = new Layout(Layout.pointy, new Vector2(config.hex_width, config.hex_height), new Vector2(0, 0));
        // this.renderer = new Renderer(this.div_container, this.canvas_map, this.div_debug, this.layout);
        this.input = new Input(this.canvas_map, this.layout);
        this.hud = new Hud();

        this.hud.addListener(this);
        this.gameloop.addListener(this.input);
        this.gameloop.addListener(this);
        // this.input.addListener(this.renderer);
        this.input.addListener(this);
        this.connection.addListener(this);
        this.gameloop.run();

        //PIXI
        let _w = window.innerWidth;
        let _h = window.innerHeight;

        this.p_renderer = new PIXI.Renderer({
            view: this.canvas_map[0],
            width: _w,
            height: _h,
            resolution: window.devicePixelRatio,
            autoDensity: true
        });

        window.addEventListener('resize', resize);

        function resize() {
            _w = window.innerWidth;
            _h = window.innerHeight;

            this.p_renderer.resize(_w, _h);
        }

        this.loader = PIXI.Loader.shared
            .add("terrain_water_deep", "../img/water_02.png")
            .add("terrain_water_shallow", "../img/water_01.png")
            .add("terrain_sand", "../img/sand_07.png")
            .add("terrain_sand_grassy", "../img/sand_09.png")
            .add("terrain_grass_sandy", "../img/grass_07.png")
            .add("terrain_grass", "../img/grass_05.png")
            .add("terrain_grass_dirty", "../img/grass_06.png")
            .add("terrain_dirt_grassy", "../img/dirt_07.png")
            .add("terrain_dirt", "../img/dirt_06.png")
            .add("terrain_dirt_stony", "../img/dirt_10.png")
            .add("terrain_stone_dirty", "../img/stone_09.png")
            .add("terrain_stone", "../img/stone_07.png")
            .add("terrain_ice", "../img/ice_01.png")
            .add("treeSmall", "../img/tree_small.png")
            .add("treeBig", "../img/tree_big.png")
            .add("cactus1", "../img/cactus_01.png")
            .add("cactus2", "../img/cactus_02.png")
            .add("treeFirSmall", "../img/fir_small.png")
            .add("treeFirBig", "../img/fir_big.png")
            .add("treeFullFirSmall", "../img/fullfir_small.png")
            .add("treeFullFirBig", "../img/fullfir_big.png")
            .add("treeFirSnow", "../img/fir_snow.png")
            .add("rock01", "../img/rock_01.png")
            .add("rock02", "../img/rock_02.png")
            .add("rock04", "../img/rock_04.png")
            .add("rock05", "../img/rock_05.png")
            .add("iron", "../img/iron.png")
            .add("gold", "../img/gold.png")
            .add("town_center", "../img/town_center.png")
            .add("forester_hut", "../img/forester_hut.png")
            .add("quarry_hut", "../img/mine.png")
            .add("iron_hut", "../img/mine.png")
            .add("gold_mine", "../img/mine.png")
            .add("unit_scout_own", "../img/unit_scout_own.png")
            .load(() => this.loaded());

        Log.info("Client ready");
    }

    loaded() {
        this.loaderready = true;
    }

    pixirender() {
        let stage = new PIXI.Container();
        let container = new PIXI.Container();
        stage.addChild(container);

        if (this.cWorld) {
            let keys = Object.keys(this.cWorld.tiles);
            for (let key of keys) {
                let tile = this.cWorld.tiles[key];
                let hex = tile.hex;
                let corners = this.layout.polygonCorners(hex);
                let padding = 10;

                let texture = this.getTerrainTexture(tile.height); //TODO:Replace with correct tile
                let img = new PIXI.Sprite(texture);
                img.x = corners[3].x + padding;//obere linke ecke
                img.y = corners[3].y - this.layout.size.y / 2 + padding; //obere linke ecke- halbe höhe
                img.width = this.layout.size.x * Math.sqrt(3) - padding; //radius mal wurzel aus 3 um die reale breite des hex zu errechnen
                img.height = this.layout.size.y * 2 - padding;//radius mal 2 um die reale höhe des hex zu errechnen
                console.log(img.x, img.y)
                stage.addChild(img);

                for (let i = 0; i < tile.environmentSpots.length; i++) {
                    let spot = tile.environmentSpots[i];
                    let texture = spot.texture;
                    let img = new PIXI.Sprite(this.loader.resources[texture].texture);
                    let pos = spot.pos;
                    img.x = this.layout.hexToPixel(hex).x + pos.x;
                    img.y = this.layout.hexToPixel(hex).y + pos.y;
                    stage.addChild(img);
                }

                // ctx.filter = "none";

                // ctx.restore();
            }
        }

        this.p_renderer.render(stage);
    }

    getTerrainTexture(height) {
        if (height < Rules.settings.map_level_water_deep) {
            return this.loader.resources["terrain_water_deep"].texture;
        } else if (height < Rules.settings.map_level_water_shallow) {
            return this.loader.resources["terrain_water_shallow"].texture;
        } else if (height < Rules.settings.map_level_sand) {
            return this.loader.resources["terrain_sand"].texture;
        } else if (height < Rules.settings.map_level_sand_grassy) {
            return this.loader.resources["terrain_sand_grassy"].texture;
        } else if (height < Rules.settings.map_level_grass_sandy) {
            return this.loader.resources["terrain_grass_sandy"].texture;
        } else if (height < Rules.settings.map_level_grass) {
            return this.loader.resources["terrain_grass"].texture;
        } else if (height < Rules.settings.map_level_grass_dirty) {
            return this.loader.resources["terrain_grass_dirty"].texture;
        } else if (height < Rules.settings.map_level_dirt_grassy) {
            return this.loader.resources["terrain_dirt_grassy"].texture;
        } else if (height < Rules.settings.map_level_dirt) {
            return this.loader.resources["terrain_dirt"].texture;
        } else if (height < Rules.settings.map_level_dirt_stony) {
            return this.loader.resources["terrain_dirt_stony"].texture;
        } else if (height < Rules.settings.map_level_stone_dirty) {
            return this.loader.resources["terrain_stone_dirty"].texture;
        } else if (height < Rules.settings.map_level_stone) {
            return this.loader.resources["terrain_stone"].texture;
        } else if (height <= Rules.settings.map_level_ice) {
            return this.loader.resources["terrain_ice"].texture;
        } else return this.loader.resources["terrain_stone"].texture;
    }

    onRender() {
        // this.renderer.draw(this.pixi, this.cWorld);
    }

    onConstructionRequested(name: string): void {
        this.connection.send("request construction", { name: name, pos: this.selectedHex });
    }

    onUnitRequested(name: string): void {
        this.connection.send("request unit", { name: name, pos: this.selectedHex });
    }

    onUnitsSelected(uids: string[]): void {
        this.selectedArmies = uids;
    }

    onRightClick(cursorCanvas: Vector2, cursorWorld: Vector2) {
        let clickedHex = this.layout.pixelToHex(cursorWorld).round();
        if (clickedHex /*&& this.cWorld.tiles[clickedHex.hash()]*/) {
            this.connection.send("request movement", { selection: this.selectedArmies, target: clickedHex });
        }
    }

    onLeftClick(cursorCanvas: Vector2, cursorWorld: Vector2) {
        this.selectedHex = this.layout.pixelToHex(cursorWorld).round();
        if (this.selectedHex && this.cWorld.tiles[this.selectedHex.hash()]) {
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
            // this.renderer.requestRedraw();
        });
        socket.on("gamestate discovered tiles", (data) => {
            for (let property in data) {
                if (data.hasOwnProperty(property)) {
                    this.cWorld.tiles[property] = data[property];
                }
            }
            if (this.loaderready && !this.alreadydrawn) {
                this.alreadydrawn = true;
                this.pixirender();
            }
            // this.renderer.requestRedraw();
        });
        socket.on("gamestate armies", (data) => {
            this.cWorld.armies = data;
            for (let army of this.cWorld.armies) {
                if (army.owner !== currentUid) {
                    if (this.cWorld.playerRelations[PlayerRelation.getHash(army.owner, currentUid)] === undefined) {
                        this.connection.send("request relation", { id1: army.owner, id2: currentUid });
                    }
                }
            }
            // this.renderer.requestRedraw();
        });
        socket.on("gamestate battles", (data) => {
            this.cWorld.battles = data;
            // this.renderer.requestRedraw();
        });
        socket.on("gamestate buildings", (data) => {
            this.cWorld.buildings = data;
            if (!this.initialFocusSet) {
                this.initialFocusSet = true;
                // this.pixirender()
                // this.renderer.focus(this.cWorld.buildings[0].pos);
            }
            // this.renderer.requestRedraw();
        });
        socket.on("gamestate relation", (data) => {
            let hash = PlayerRelation.getHash(data.id1, data.id2);
            this.cWorld.playerRelations[hash] = data;
        });
    }
}

declare const currentUid;