
import * as dotenv from "dotenv";
dotenv.config();

import config from "./util/config"
import WebServer from "./web/webserver"
import GameServer from "./game/gameserver"
import Log from "./util/log";
import Mapgen from "./game/mapgen";
import World from "./game/world";
import * as Rules from "../../shared/rules.json"

Log.info("Config: "+config.name);
Log.info("Config Content: "+JSON.stringify(config));
Log.info("Starting Server");

const server_web:WebServer = new WebServer();

const world:World = Mapgen.create(Math.random(), Rules.settings.map_size, Rules.settings.map_frequency, Rules.settings.map_amplitude, Rules.settings.map_min, Rules.settings.map_max, Rules.settings.map_octaves, Rules.settings.map_persistence);

const server_game:GameServer = new GameServer(world);

server_game.listen(server_web.getHttpServer());
server_game.run();
Log.info("Gameserver started");
server_web.gameserver = server_game;
server_web.run();
Log.info("Webserver started");
