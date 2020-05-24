/**
 * Created by geller on 31.08.2016.
 *
 */
import $ from 'jquery';
import Game from "./game";

$(document).ready(function () {
    $.get("/config.json", function (config, status) {
        if(status === "success") {
            new Game(config);
        }
    });
});
