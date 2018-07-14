/**
 * Behandelt die Serverseitige Config
 * Um Zugriff auf die Werte der Config zu bekommen, nutze require("./config");
 * Created by geller on 01.09.2016.
 */
import * as fs from "fs";
import * as path from "path";

const path_config_default = path.join(__dirname, "../../config/default.json");
const DEFAULT_CONFIG_NAME = "default";

let config = null;
let name;

module.exports = getConfig();
module.exports.getName = getName();

/**
 * Singleton getter.
 * @returns {*}
 */
function getConfig() {
    if(!config) {
        config = loadConfig();
    }
    return config;
}

/**
 * Gibt den Namen der Config wieder.
 * @returns {*}
 */
function getName() {
    if(!name) {
        loadConfig();
    }
    return name;
}

/**
 * Lädt die in den Node Parametern gesetzte Config und setzt die Instanzvariable "config".
 */
function loadConfig() {
    if(process.argv.length >=2) {
        name = process.argv[2]; //Hole den Config-Namen-Parameter
        if(!name) {
            name = DEFAULT_CONFIG_NAME;
        }
        
        const path_config = path.join(__dirname, "../../config/"+name+".json");
        const config_default = JSON.parse(fs.readFileSync(path_config_default, {encoding:"utf8"}));
        const config_custom = JSON.parse(fs.readFileSync(path_config, {encoding:"utf8"}));

        //Stelle sicher, dass alle Parameter der Default Config in der Custom-Config vorhanden sind.
        if(config_custom) {
            for(let item in config_default) {
                //noinspection JSUnfilteredForInLoop
                if(!config_custom.hasOwnProperty(item)) {
                    //noinspection JSUnfilteredForInLoop
                    config_custom[item] = config_default[item];
                }
            }
            return config_custom;
        } else {
            return config_default;
        }
    }
}
