/**
 * Created by geller on 31.08.2016.
 */
import Game from "./game";
import * as DebugConfig from "./config/config_debug.json"


document.addEventListener('DOMContentLoaded', function() {
    let configRequest = new XMLHttpRequest()
    if(location.hostname === "127.0.0.1") {
        //For debugging purposes
        new Game(DebugConfig);
    } else {
        configRequest.onreadystatechange = function (data) {
            if(this.readyState == 4 && this.status == 200) {
                new Game(JSON.parse(this.responseText));
            }
        }
        configRequest.open('GET', "/config.json");
        configRequest.send();
    }
});
