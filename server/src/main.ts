import config from "./util/config"
import WebServer from "./webserver"
import GameServer from "./gameserver"
import Log from "./util/log";

Log.info("Config: "+config.name);
Log.info("Config Content: "+JSON.stringify(config));

Log.info("Starting Server");

const server_web:WebServer = new WebServer();
const server_game:GameServer = new GameServer();

server_game.listen(server_web.getHttpServer());
server_game.run();
Log.info("Gameserver started");
server_web.run();
Log.info("Webserver started");
