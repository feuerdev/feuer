import { createLogger, transports, format, Logger } from "winston"
import { Config } from "../main"

let logger: Logger = null

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
  const logger = createLogger({
    transports: [
      new transports.Console({
        level: logLevel,
        format: format.combine(format.timestamp(), format.colorize(), format.simple()),
      }),
    ],
  })

  return logger
}
