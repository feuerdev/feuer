/**
 * Created by geller on 31.08.2016.
 */

import * as $ from "./lib/jquery-3.1.1.min";
import Log from "./util/log";
import Game from "./game";
import Connection from "./connection";
import Renderer from "./renderer";

declare const config;

$(document).ready(function() {
    const connection = new Connection(config.ip, config.transports);
    connection.connect();
    const renderer = new Renderer();

    // const game = new Game();
    Log.info("Client ready");
});
