import { Socket } from "socket.io";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";

import Vector2 from "../../shared/vector2";
import Hex, { Layout } from "../../shared/hex";
import * as Rules from "../../shared/rules.json";
import * as Util from "../../shared/util";
import PlayerRelation from "../../shared/relation";

import Connection, { ConnectionListener } from "./connection";
import ClientWorld from "./clientworld";

/**
 * Client side game logic
 */
export default class Game implements ConnectionListener {

    private canvas_map = <HTMLCanvasElement> document.querySelector("#canvas-map");
    private div_debug = document.querySelector("#debug");

    private connection: Connection;
    private layout: Layout;
    private cWorld: ClientWorld = new ClientWorld();

    private loader: PIXI.Loader;
    private p_renderer: PIXI.Renderer;
    private viewport: Viewport;

    private selectedHex: Hex = null;
    private selectedBuilding: any = null;
    private selectedUnits: any[] = [];

    private initialFocusSet = false;

    static GLOWFILTER = new GlowFilter({ distance: 15, outerStrength: 2 });

    constructor(config) {
        this.connection = new Connection(config.ip, config.transports);
        this.layout = new Layout(Layout.pointy, new Vector2(Rules.settings.map_hex_width, Rules.settings.map_hex_height), new Vector2(0, 0));

        this.connection.addListener(this);

        this.p_renderer = new PIXI.Renderer({
            view: this.canvas_map,
            width: window.innerWidth,
            height: window.innerHeight,
            resolution: window.devicePixelRatio,
            autoDensity: true
        });

        window.addEventListener('resize', () => {
            this.p_renderer.resize(window.innerWidth, window.innerHeight);
            this.viewport.dirty = true;
        });
        window.addEventListener("keydown", event => {
            //
        }, false);

        window.addEventListener("keyup", event => {
            switch (event.keyCode) {
                case 187: this.viewport.zoom(-200, true); break;//+
                case 189: this.viewport.zoom(200, true); break;//-   
                case 191: this.viewport.setZoom(1, true); break;//#
                case 82: this.viewport.center = new PIXI.Point(0, 0); break; //R
                default:
                    break;
            }
        }, false);

        // //Setup Hud
        // let tabs = $(".hud-tab");
        // let contents = $(".hud-content")
        // tabs.click(e => {
        //     let id:string = e.target.id;
        //     let name:string = id.substring(1, id.length);
            
        //     console.log(`clicked ${id}`);

        //     tabs.removeClass("active");
        //     contents.hide();
            
        //     document.querySelectorAll((`#b${name}`).classList.add("active");
        //     document.querySelectorAll((`#t${name}`).show();
        // });

        // $("#bInfo").click(); //Start on Info Tab

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

        console.info("Client ready");
    }

    loaded() {

        // create viewport
        this.viewport = new Viewport({
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            worldWidth: Rules.settings.map_size * Rules.settings.map_hex_width,
            worldHeight: Rules.settings.map_size * Rules.settings.map_hex_height,
            interaction: this.p_renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        })

        this.viewport.on('clicked', (click) => {
            console.log(click.event.data.button);
            let p = click.world;
            let v = new Vector2(p.x, p.y);
            switch (click.event.data.button) {
                case 0: //Left
                    this.clearSelection();
                    for(let child of (<any>click.viewport).viewport.children) {
                        for(let s of (<PIXI.Container>child).children) {
                            if(s.name && parseInt(s.name) !== -1) {//Dont click on environment
                                if(Util.isPointInRectangle(p.x,p.y,s.x,s.y, (<PIXI.Sprite>s).width, (<PIXI.Sprite>s).height)) {
                                    for(let unit of this.cWorld.armies) {
                                        if(s.name === unit.id) {
                                            this.selectedUnits.push(unit);
                                            this.updateHudInfo();
                                            this.updateScenegraph(this.cWorld.tiles[this.layout.pixelToHex(v).round().hash()]);
                                            return;
                                        }
                                    }
                                    for(let building of this.cWorld.buildings) {
                                        if(s.name === building.id) {
                                            this.clearSelection();
                                            this.selectedBuilding = building;
                                            this.updateScenegraph(this.cWorld.tiles[this.layout.pixelToHex(v).round().hash()]);
                                            this.updateHudInfo();
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    this.selectedHex = this.layout.pixelToHex(v).round();
                    if (this.selectedHex && this.cWorld.tiles[this.selectedHex.hash()]) {
                        this.updateScenegraph(this.cWorld.tiles[this.selectedHex.hash()]);
                        this.updateHudInfo();
                    } else {
                        this.selectedHex = null;
                    }
                    break;
                case 2: //Right 
                    let clickedHex = this.layout.pixelToHex(v).round();
                    if (clickedHex) {
                        this.connection.send("request movement", { selection: this.selectedUnits.map((unit) => {return unit.id}), target: clickedHex });
                    }
                    break;
            }
        })

        // activate plugins
        this.viewport
            .clampZoom({
                maxScale: 2,
                minScale: 0.2
            })
            .drag()
            .pinch()
            .wheel()
            .decelerate();

        PIXI.Ticker.shared.add(() => {
            if (this.viewport.dirty) {
                this.p_renderer.render(this.viewport);
                this.viewport.dirty = false;
            }

            //TODO: Performance - Dont update this every frame
            this.div_debug.innerHTML = "";
            this.div_debug.innerHTML +=("<em>General Information</em><br>");
            this.div_debug.innerHTML +=("UID   : " + currentUid + "<br>");
            this.div_debug.innerHTML +=(`Screenheight : ${this.viewport.screenHeight} "<br>"`);
            this.div_debug.innerHTML +=(`Screenwidth  : ${this.viewport.screenWidth} "<br>"`);
            this.div_debug.innerHTML +=(`Worldheight : ${this.viewport.worldHeight} "<br>"`);
            this.div_debug.innerHTML +=(`Worldwidth  : ${this.viewport.worldWidth} "<br>"`);
            this.div_debug.innerHTML +=(`Left/Top: ${Math.round(this.viewport.left)}/${Math.round(this.viewport.top)} "<br>"`);
            this.div_debug.innerHTML +=(`Center: ${Math.round(this.viewport.center.x)}/${Math.round(this.viewport.center.y)} "<br>"`);
            if (this.selectedHex) this.div_debug.innerHTML +=("Selected Hex   : " + this.selectedHex.q + " " + this.selectedHex.r + " " + this.selectedHex.s + "<br>");
        });
    }

    clearSelection() {
        this.selectedHex = null;
        this.selectedUnits = [];
        this.selectedBuilding = null;
        this.updateHudInfo();
    }

    updateScenegraph(tile) {
        let hex: Hex = new Hex(tile.hex.q, tile.hex.r, tile.hex.s);

        let corners = this.layout.polygonCorners(hex);
        let padding = 10;

        let container = new PIXI.Container();
        container.name = hex.hash();

        let tint = tile.visible ? 0xDDDDDD : 0x555555;
        if (this.selectedHex && this.selectedHex.equals(tile.hex)) {
            tile.visible ? tint = 0xFFFFFF : tint += 0x333333;
        }

        let texture = this.getTerrainTexture(tile.height);
        let img = new PIXI.Sprite(texture);
        img.tint = tint;
        img.x = corners[3].x + padding;//obere linke ecke
        img.y = corners[3].y - this.layout.size.y / 2 + padding; //obere linke ecke- halbe höhe
        img.width = this.layout.size.x * Math.sqrt(3) - padding;
        img.height = this.layout.size.y * 2 - padding;
        
        container.addChild(img);

        for (let i = 0; i < tile.environmentSpots.length; i++) {
            let spot = tile.environmentSpots[i];
            let texture = spot.texture;
            let img = new PIXI.Sprite(this.loader.resources[texture].texture);
            let pos = spot.pos;
            img.x = this.layout.hexToPixel(hex).x + pos.x;
            img.y = this.layout.hexToPixel(hex).y + pos.y;
            img.tint = tint;
            img.name = spot.id;
            if(this.selectedBuilding && this.selectedBuilding.id === spot.id) {
                img.filters = [               
                    Game.GLOWFILTER
                ];
            }
            for(let army of this.selectedUnits) {
                if(army.id === spot.id) {
                    img.filters = [               
                        Game.GLOWFILTER
                    ];
                }
            }
            container.addChild(img);
        }

        let old = this.viewport.getChildByName(hex.hash());
        if (old) {
            this.viewport.removeChild(old);
        }
        this.viewport.addChild(container);
        this.viewport.dirty = true;
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

    onConstructionRequested(name: string): void {
        this.connection.send("request construction", { name: name, pos: this.selectedHex });
    }

    onUnitRequested(name: string): void {
        this.connection.send("request unit", { name: name, pos: this.selectedHex });
    }

    onUnitsSelected(uids: string[]): void {
        this.selectedUnits = uids;
    }

    onConnected(socket: Socket) {
        console.info("Connected");
    }
    onDisconnected(socket: Socket) {
        console.info("Disonnected");
    }
    onSetup(socket: Socket) {
        //Hier alle Gamelevel Events implementieren
        socket.on("gamestate tiles", (data) => {
            for (let property in this.cWorld.tiles) {
                if (this.cWorld.tiles.hasOwnProperty(property)) {
                    this.cWorld.tiles[property].visible = false;
                    this.updateScenegraph(this.cWorld.tiles[property]); //TODO: Performance - Only update Tint here instead of whole tile
                }
            }
            for (let property in data) {
                if (data.hasOwnProperty(property)) {
                    data[property].visible = true;
                    this.cWorld.tiles[property] = data[property];
                    this.updateScenegraph(this.cWorld.tiles[property]);
                }
            }
        });
        socket.on("gamestate discovered tiles", (data) => {
            for (let property in data) {
                if (data.hasOwnProperty(property)) {
                    this.cWorld.tiles[property] = data[property];
                    this.updateScenegraph(this.cWorld.tiles[property]);
                }
            }
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
        });
        socket.on("gamestate battles", (data) => {
            this.cWorld.battles = data;
        });
        socket.on("gamestate buildings", (data) => {
            this.cWorld.buildings = data;
            if (!this.initialFocusSet) {
                this.initialFocusSet = true;
                let ref = this.cWorld.buildings[0];
                if (ref) {
                    let x = this.layout.hexToPixel(ref.pos).x
                    let y = this.layout.hexToPixel(ref.pos).y
                    this.viewport.center = new PIXI.Point(x, y);
                }
            }
        });
        socket.on("gamestate relation", (data) => {
            let hash = PlayerRelation.getHash(data.id1, data.id2);
            this.cWorld.playerRelations[hash] = data;
        });
    }

    updateHudInfo() {
        let info:string;
        if(this.selectedUnits.length > 0) {
            info = this.generateUnitInfoString(this.selectedUnits);
        } else if(this.selectedBuilding != null) {
            info = this.generateBuildingInfoString(this.selectedBuilding);
        } else if(this.selectedHex) {
            info = this.generateHexInfoString(this.selectedHex);
        } else {
            info = "Select something to display more Information";
        }
        document.querySelector("#tInfo").innerHTML = info;
    }

    generateUnitInfoString(units) {
        let result = "";
        for(let unit of units) {
            result += "<b>Army Info</b></br>";
            result += "Id: " + unit.id + "</br>";
            result += "Speed: " + unit.speed.toFixed(2) + "</br>";
            result += "Attack: " + unit.attack.toFixed(2) + "</br>";
            result += "Health: " + unit.hp.toFixed(2) + "</br>";
            result += "Spotting Distance: " + unit.spottingDistance.toFixed(2) + "</br>";
            result += "Target: " + unit.targetHexes.slice(-1).pop(); +"</br>";
            result += "</br>";
            result += "<b>Carrying</b></br>";
            result += "Food: " + unit.food + "</br>";
            result += "Wood: " + unit.wood + "</br>";
            result += "Stone: " + unit.stone + "</br>";
            result += "Iron: " + unit.iron + "</br>";
            result += "Gold: " + unit.gold + "</br>";
            result += "</br>";
            result += "</br>";
        }        
        return result;
    }

    generateBuildingInfoString(building) {
        let result = "";
    result += "<b>Building Info</b></br>";
    result += "Id: " + building.id + "</br>";
    if (building.foodHarvest) {
      result += "Food Generation: " + building.foodHarvest + "</br>";
    }
    if (building.woodHarvest) {
      result += "Wood Generation: " + building.woodHarvest + "</br>";
    }
    if (building.stoneHarvest) {
      result += "Stone Generation: " + building.stoneHarvest + "</br>";
    }
    if (building.ironHarvest) {
      result += "Iron Generation: " + building.ironHarvest + "</br>";
    }
    if (building.goldHarvest) {
      result += "Iron Generation: " + building.goldHarvest + "</br>";
    }
    return result;
    }

    generateHexInfoString(tile) {
        let result = "";
        result += "Position: " + Hex.hash(tile.hex) + "</br>";
        result += "</br>";
        result += "<b>Resources</b></br>";
        for(let res of Object.keys(tile.resources)) {
          result += `${res}: ${tile.resources[res]}</br>`;
        }
        result += "</br>";
        result += "<b>Tile Info</b></br>";
        result += "Forestation: " + tile.forestation.toFixed(2) + "</br>";
        result += "Iron Ore: " + tile.ironOre.toFixed(2) + "</br>";
        result += "Gold Ore: " + tile.goldOre.toFixed(2) + "</br>";
        result += "Height: " + tile.height.toFixed(2) + "</br>";
        result += "Rockyness: " + tile.rockyness.toFixed(2) + "</br>";
        result += "Movementfactor: " + tile.movementFactor.toFixed(2) + "</br>";
        return result;
    }

}

declare const currentUid;