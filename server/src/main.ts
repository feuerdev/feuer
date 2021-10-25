import * as dotenv from "dotenv"
dotenv.config()

import config from "./util/config"
import WebServer from "./web/webserver"
import GameServer from "./game/gameserver"
import Log from "./util/log"
import Mapgen from "./game/mapgen"
import * as Rules from "../../shared/rules.json"

Log.info("Config: " + config.name)
Log.info("Config Content: " + JSON.stringify(config))
Log.info("Starting Server")

const world = Mapgen.create(
  Math.random(),
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
