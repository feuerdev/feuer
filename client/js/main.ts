/**
 * Created by geller on 31.08.2016.
 */
import * as $ from "./lib/jquery-3.1.1.min";
import Log from "./util/log";
import Vector2 from "../../shared/vector2";
import Gameloop from "../../shared/gameloop";
import Hex, { Layout } from "../../shared/hex";
import Renderer from "./renderer";
import Input, { InputListener } from "./input";
import Connection, { ConnectionListener } from "./connection";
import { Socket } from "socket.io";
import Hud from "./hud";

declare const config;

class Game implements InputListener, ConnectionListener {
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

    constructor() {
        this.gameloop = new Gameloop(Gameloop.requestAnimationFrameWrapper, config.updaterate, config.netrate)
        this.connection = new Connection(config.ip, config.transports);
        this.layout = new Layout(Layout.pointy, new Vector2(config.hex_width, config.hex_height), new Vector2(0, 0));
        this.renderer = new Renderer(this.div_container, this.canvas_map, this.canvas_fow, this.canvas_entities, this.div_debug, this.layout);
        this.input = new Input(this.canvas_entities, this.layout);
        this.hud = new Hud();

        this.hud.addListener(this);
        this.gameloop.addListener(this.input);
        this.gameloop.addListener(this.renderer);
        this.input.addListener(this.renderer);
        this.input.addListener(this.hud);
        this.input.addListener(this);
        this.connection.addListener(this);
        this.gameloop.run();

        Log.info("Client ready");
    }
    onHexSelected(hex: Hex) {
        this.connection.send("request movement", hex);
    }
    onConnected(socket: Socket) {
        Log.info("Connected");
    }
    onDisconnected(socket: Socket) {
        Log.info("Disonnected");
    }
    onSetup(socket: Socket) {
        //Hier alle Gamelevel Events implementieren 
        socket.on("gamestate world", (data) => this.renderer.setWorld(data));
    }
}

$(document).ready(function () {
    new Game();
});
