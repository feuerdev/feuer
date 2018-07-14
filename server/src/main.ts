import config from "./util/config"
import WebServer from "./webserver"
import SocketServer from "./socketserver"
import GameServer from "./gameserver"
import Log from "./util/log";

Log.info("Config: "+config.name);
Log.info("Config Content: "+JSON.stringify(config));

Log.info("Starting Server");

const server_web:WebServer = new WebServer();
const server_socket:SocketServer = new SocketServer(server_web.getHttpServer());
const server_game:GameServer = new GameServer();


// this.io.on("connection", function(socket) {
//   socket.on("login", data => gameserver.onLogin(socket, data));
//   socket.on("disconnect", () => gameserver.onLogout(socket.id));
//   socket.on("input left", data => gameserver.onInputLeft(socket.id, data));
//   socket.on("input up", data => gameserver.onInputUp(socket.id, data));
//   socket.on("input right", data => gameserver.onInputRight(socket.id, data));
//   socket.on("input down", data => gameserver.onInputDown(socket.id, data));
//   socket.on("input spawn", data => gameserver.onInputSpawn(socket.id, data));
//   socket.on("input click", data => gameserver.onInputClick(socket.id, data.unitIds, data.pos));
//   socket.on("tiles visible", data => gameserver.onRequestTilesVisible(socket.id, data));
// });

server_web.run();
Log.info("Webserver started");
server_game.run();
Log.info("Gameserver started");
server_socket.run();
Log.info("Socketserver started");
