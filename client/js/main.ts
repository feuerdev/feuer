/**
 * Created by geller on 31.08.2016.
 */

import * as $ from "./lib/jquery-3.1.1.min";
import Log from "./util/log";
import Game from "./game";
import Renderer from "./renderer";

declare const config;

$(document).ready(function() {
    const game = new Game();
    if(!config.local) {
        game.connect();
    }
    game.run();
    Log.info("Client ready");
});
