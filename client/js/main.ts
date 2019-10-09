/**
 * Created by geller on 31.08.2016.
 */
import * as $ from "./lib/jquery-3.1.1.min";
import Log from "./util/log";
import Vector2 from "../../shared/vector2";
import Gameloop from "../../shared/gameloop";
import { Layout } from "../../shared/hex";
import Renderer from "./renderer";
import Input from "./input";
import Connection, { ConnectionListener } from "./connection";
import { Socket } from "socket.io";

declare const config;

$(document).ready(function () {
    let canvas_map = $("#canvas-map");
    let canvas_fow = $("#canvas-fow");
    let canvas_entities = $("#canvas-entities");
    let div_container = $("#canvas-container");
    let div_debug = $("#debug");

    let gameloop = new Gameloop(Gameloop.requestAnimationFrameWrapper, config.updaterate, config.netrate)
    let connection = new Connection(config.ip, config.transports);
    let layout:Layout = new Layout(Layout.pointy, new Vector2(config.hex_width, config.hex_height), new Vector2(0,0));
    let renderer = new Renderer(div_container, canvas_map, canvas_fow, canvas_entities, div_debug, layout);
    let input = new Input(canvas_entities, layout);

    gameloop.addListener(input);
    gameloop.addListener(renderer);
    input.addListener(renderer);
    connection.addListener(new class a implements ConnectionListener {

        constructor() {
            console.log("Test");
        }

        onConnected(socket:Socket) {
            Log.info("Connected");
        }
        onDisconnected(socket:Socket) {
            Log.info("Disonnected");
        }
        onSetup(socket:Socket) {            
            socket.on("gamestate tiles", (data) => this.onGamestateTiles(data));
        }
        onGamestateTiles(data: any): void {
            renderer.setWorld(data);
        }
    });

    gameloop.run();

    Log.info("Client ready");
});
