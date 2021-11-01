/**
 * Behandelt die Logfunktionen
 * Created by geller on 31.08.2016.
 */
import * as winston from "winston"
import { Config } from "../main"

let logger = null

export default getLogger()

/**
 * Gibt die Logger Instanz zurueck.
 * @returns {*}
 */
function getLogger() {
  if (!logger) {
    logger = initLogger()
  }
  return logger
}
/**
 * Initialisiert die Logger Instanz.
 * @returns {*}
 */
function initLogger() {
  return winston.createLogger({
    level: Config.logLevel,
    format: winston.format.combine(
      winston.format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      winston.format.simple()
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: "feuer.log" }),
    ],
  })
}
