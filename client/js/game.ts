import { Socket } from "socket.io";

import Vector2 from "../../shared/vector2";
import * as Util from "../../shared/util";
import PlayerRelation from "../../shared/relation";

import Connection, { ConnectionListener } from "./connection";
import Hud, { HudListener } from "./hud";
import Selection from "./selection";
import ClientWorld from "./clientworld";
import Renderer, { RendererListener } from "./renderer";
import Hex from "../../shared/hex";
import Tile from "../../server/src/game/tile";

/**
 * Client side game logic
 */
export default class Game implements ConnectionListener, HudListener, RendererListener {

    private selection: Selection = new Selection();
    private hud: Hud = new Hud();
    private renderer: Renderer = new Renderer();
    private connection: Connection;
    private cWorld: ClientWorld = new ClientWorld();

    private initialFocusSet = false;

    constructor(config) {
        this.renderer.selection = this.selection;
        this.hud.world = this.cWorld;
        this.hud.selection = this.selection;
        this.connection = new Connection(config.ip, config.transports);

        this.connection.addListener(this);
        this.hud.addListener(this);
        this.renderer.addListener(this);

        window.addEventListener("keydown", event => {
            //
        }, false);

        window.addEventListener("keyup", event => {
            switch (event.keyCode) {
                case 187: this.renderer.viewport.zoom(-200, true); break;//+
                case 189: this.renderer.viewport.zoom(200, true); break;//-   
                case 191: this.renderer.viewport.setZoom(1, true); break;//#
                case 82: this.renderer.viewport.center = new PIXI.Point(0, 0); break; //R
                default:
                    break;
            }
        }, false);
        console.info("Client ready");
    }
    
    onRendererLoaded(): void {
        this.renderer.viewport.on('clicked', (click) => {
            let p = click.world;
            let v = new Vector2(p.x, p.y);
            switch (click.event.data.button) {
                case 0: //Left
                    this.selection.clearSelection();
                    for (let child of (<any>click.viewport).viewport.children) {
                        for (let s of (<PIXI.Container>child).children) {
                            if (s.name && parseInt(s.name) !== -1) {//Dont click on environment
                                if (Util.isPointInRectangle(p.x, p.y, s.x, s.y, (<PIXI.Sprite>s).width, (<PIXI.Sprite>s).height)) {
                                    for (let group of this.cWorld.groups) {
                                        if (s.name === group.id) {
                                            this.selection.selectGroup(group.id);
                                            this.hud.update();
                                            this.hud.showGroupSelection();
                                            this.renderer.updateScenegraph(this.cWorld.getTile(this.getHex(v)));
                                            return;
                                        }
                                    }
                                    for (let building of this.cWorld.buildings) {
                                        if (s.name === building.id) {
                                            this.selection.selectBuilding(building.id);
                                            this.hud.update();
                                            this.hud.showBuildingSelection();
                                            this.renderer.updateScenegraph(this.cWorld.getTile(this.getHex(v)));
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    let hex = this.renderer.layout.pixelToHex(v).round();
                    if (this.cWorld.tiles[hex.hash()]) {
                        this.selection.selectHex(hex);
                        this.hud.update();
                        this.hud.showTileSelection();
                        this.renderer.updateScenegraph(this.cWorld.tiles[hex.hash()]);
                        // this.updateHudInfo();
                    }
                    break;
                case 2: //Right 
                    let clickedHex = this.renderer.layout.pixelToHex(v).round();
                    if (clickedHex) {
                        this.connection.send("request movement", { selection: this.selection.selectedGroup, target: clickedHex });
                    }
                    break;
            }
        })
    }
    onUnitAdd(groupId: number, unitId: number) {
        this.connection.send("request unit add", { groupId: groupId, unitId: unitId });
    }
    onUnitRemove(groupId: number, unitId: number) {
        this.connection.send("request unit remove", { groupId: groupId, unitId: unitId });
    }

    onResourceTransfer(id: number, resource: string, amount: number): void {
        this.connection.send("request transfer", { id: id, resource: resource, amount: amount });
    }

    onDisbandRequested(id: number): void {
        this.connection.send("request disband", { id: id });
    }

    onConstructionRequested(name: string): void {
        this.connection.send("request construction", { name: name, pos: this.selection.selectedHex });
    }

    onGroupRequested(name: string): void {
        this.connection.send("request group", { name: name, pos: this.selection.selectedHex });
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
                    this.renderer.updateScenegraph(this.cWorld.tiles[property]); //TODO: Performance - Only update Tint here instead of whole tile
                }
            }
            for (let property in data) {
                if (data.hasOwnProperty(property)) {
                    data[property].visible = true;
                    this.cWorld.tiles[property] = data[property];
                    this.renderer.updateScenegraph(this.cWorld.tiles[property]);
                }
            }
            this.hud.update();
        });
        socket.on("gamestate discovered tiles", (data) => {
            for (let property in data) {
                if (data.hasOwnProperty(property)) {
                    this.cWorld.tiles[property] = data[property];
                    this.renderer.updateScenegraph(this.cWorld.tiles[property]);
                }
            }
        });
        socket.on("gamestate groups", (data) => {
            this.cWorld.groups = data;
            for (let group of this.cWorld.groups) {
                if (group.owner !== currentUid) {
                    if (this.cWorld.playerRelations[PlayerRelation.getHash(group.owner, currentUid)] === undefined) {
                        this.connection.send("request relation", { id1: group.owner, id2: currentUid });
                    }
                }
            }
            this.hud.update();
        });
        socket.on("gamestate battles", (data) => {
            this.cWorld.battles = data;
            this.hud.update();
        });
        socket.on("gamestate buildings", (data) => {
            this.cWorld.buildings = data;
            if (!this.initialFocusSet) {
                this.initialFocusSet = true;
                let ref = this.cWorld.buildings[0];
                if (ref) {
                    this.renderer.center(ref.pos);

                }
            }
            this.hud.update();
        });
        socket.on("gamestate relation", (data) => {
            let hash = PlayerRelation.getHash(data.id1, data.id2);
            this.cWorld.playerRelations[hash] = data;
        });
    }
    
    getHex(vector:Vector2):Hex {
        return this.renderer.layout.pixelToHex(vector).round();
    }
}

declare const currentUid;