/**
 * Diese Klasse behandelt den HttpServer
 */
import config from "./util/config";
import * as http from "http";
import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import * as db from "./util/db";

import router_game from "./routes/game";

const directory_client = path.join(__dirname, "/../../client"); //Gibt das Client-Root-Verzeichnis zurueck.;
    
export default class Webserver {
  
  private app = express();
  private httpServer: http.Server = http.createServer(this.app); 

  constructor() {
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.use(bodyParser.json());
        this.app.use(express.static(directory_client));

        this.app.get("/login", function(req, res) {
            res.sendFile("login.html", {root: directory_client});
        });

        this.app.post("/login", function(req, res) {
            res.send("Reg complete");
        });
        
        this.app.get("/register", function(req, res) {

            


            res.sendFile("register.html", {root: directory_client});
        });

        this.app.post("/register", function(req, res) {

            const username = req.body.username;
            const email = req.body.email;
            const password = req.body.password;
            const passwordRepeat = req.body.passwordRepeat;
            console.log({username, email, password, passwordRepeat});
            console.log(db.query("SELECT 1 + 1 AS solution"));
            res.send("Reg complete");
        });


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
