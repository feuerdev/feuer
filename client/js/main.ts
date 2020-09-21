/**
 * Created by geller on 31.08.2016.
 */
import Game from "./game";

document.addEventListener('DOMContentLoaded', function() {
    let configRequest = new XMLHttpRequest()
    configRequest.onreadystatechange = function (data) {
        if(this.readyState == 4 && this.status == 200) {
            new Game(JSON.parse(this.responseText));
        }
    }
    configRequest.open('GET', "/config.json");
    configRequest.send();
});
