import yargs from "yargs/yargs"

const ENV_PREFIX = "FEUER"
export const Config = yargs(process.argv.slice(2))
  .env(ENV_PREFIX)
  .option("logLevel", {
    alias: "l",
    description: "Log level for winston logger",
    choices: ["error", "warn", "info", "verbose", "debug"],
    type: "string",
    default: "info",
  })
  .option("port", {
    alias: "p",
    description: "The port to expose the server",
    type: "number",
    default: 5000,
  })
  .option("updateRate", {
    alias: "u",
    description:
      "How many times per second the server will send updates to all clients",
    type: "number",
    default: 1,
  })
  .option("referenceRate", {
    alias: "r",
    description: "How fast the game will run",
    type: "number",
    default: 1,
  })
  .option("dbHost", {
    alias: "DB_HOST",
    description: "Database url",
    type: "string",
    default: "database",
  })
  .option("dbName", {
    alias: "DB_NAME",
    description: "Database name",
    type: "string",
    default: "feuer",
  })
  .option("dbUser", {
    alias: "DB_USER",
    description: "Database username",
    type: "string",
    default: "feuer",
  })
  .option("dbPassword", {
    alias: "DB_PASSWORD",
    description: "Database password",
    type: "string",
  })
  .option("firebaseProjectId", {
    alias: "FB_project_id",
    description: "Firebase Project Id",
    type: "string",
    default: "feuer-io",
  })
  .option("fbKey", {
    alias: "FB_KEY",
    description: "Firebase Private Key",
    type: "string",
  })
  .option("firebaseClientEmail", {
    alias: "FB_client_email",
    description: "Firebase Client Email",
    type: "string",
    default: "firebase-adminsdk-pnpe7@feuer-io.iam.gserviceaccount.com",
  })
  .parseSync()

import WebServer from "./web/webserver"
import GameServer from "./game/gameserver"
import Log from "./util/log"
import Mapgen from "./game/mapgen"
import * as Rules from "../../shared/rules.json"
import { getDb } from "./util/db"

Log.debug(`Configuration: ${JSON.stringify(Config)}`)
Log.info("Starting Server")

const world = Mapgen.create(
  `${Math.random()}`,
  Rules.settings.map_size,
  Rules.settings.map_frequency,
  Rules.settings.map_amplitude,
  Rules.settings.map_min,
  Rules.settings.map_max,
  Rules.settings.map_octaves,
  Rules.settings.map_persistence
)

const gameserver = new GameServer(world)
const webserver = new WebServer(gameserver)

gameserver.listen(webserver.getHttpServer())
gameserver.run()
Log.info("Gameserver started")
webserver.run()
Log.info("Webserver started")
