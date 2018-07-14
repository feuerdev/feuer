/**
 * Diese Klasse behandelt den HttpServer
 */
import config from "./util/config";
import * as http from "http";
import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";

import router_game from "./routes/game";

const directory_client = path.join(__dirname, "/../../client"); //Gibt das Client-Root-Verzeichnis zurueck.;
    
export default class Webserver {
  
  private app = express();
  private httpServer: http.Server = http.createServer(this.app); 

  constructor() {
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.use(bodyParser.json());
        this.app.use(express.static(directory_client));

        this.app.use("/", router_game);
       
        this.app.get("/config.js", function(req, res) {
            res.sendFile("/js/config/config_"+config.name+".js", {root: directory_client});
        });
    }

    run() {
        this.httpServer.listen(process.env.PORT || config.port);
    }

    public getHttpServer() {
      return this.httpServer;
    }
};
