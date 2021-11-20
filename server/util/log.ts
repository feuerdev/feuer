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

function initLogger() {
  const logLevel = Config.logLevel
  const logger = winston.createLogger({
    transports: [
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  })

  return logger
}
