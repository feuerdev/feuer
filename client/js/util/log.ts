declare const config;

/**
 * Behandelt die Logfunktionen
 * Created by geller on 31.08.2016.
 */
"use strict";
let logger = null;

class Logger {

    private level: String;

    constructor(level) {
        this.level = level;
    }

    info(message) {
        if(this.level === "debug" || this.level === "info") {
            if(window.console) {
                console.info(message);
            }
        }
    }

    debug(message) {
        if(this.level === "debug") {
            if(window.console) {
                console.log(message);
            }
        }
    }
}

/**
 * Gibt die Logger Instanz zurueck.
 * @returns {*}
 */
function getLogger() {
    if(!logger) {
        logger = initLogger();
    }
    return logger;
}

/**
 * Initialisiert die Logger Instanz.
 * @returns {*}
 */
function initLogger() {
    return new Logger(config.log_level); //(config.log_level);
}

export default getLogger();