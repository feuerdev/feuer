/**
 * Diese Klasse behandelt den HttpServer
 */
import config from "../util/config";
import * as http from "http";
import * as express from "express";
import * as session from "express-session";
import * as passport from "passport";
import * as path from "path";
import * as bodyParser from "body-parser";
import Log from "../util/log";

import router_register from "./routes/register";
import router_login from "./routes/login";
import { eventNames } from "cluster";
import { cookie } from "express-validator/check";

const directory_client = path.join(__dirname, "../../../client"); //Gibt das Client-Root-Verzeichnis zurueck.;
    
export default class Webserver {
  
  private app = express();
  private httpServer: http.Server = http.createServer(this.app); 

  constructor() {
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.use(bodyParser.json());
        this.app.use(express.static(directory_client, {index:false}));
        this.app.use(session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {secure: config.secure_cookie}
        }));
        this.app.use(passport.initialize());
        this.app.use(passport.session());

        this.app.use("/register", router_register);
        this.app.use("/login", router_login);

        this.app.get("/", function(req, res) {
            Log.debug(JSON.stringify(req.user));
            Log.debug("Logged in: "+req.isAuthenticated());
            res.sendFile("index.html", {root: directory_client});
            // req.next();
        });
        
        this.app.get("/config.js", function(req, res) {
            res.sendFile("/js/config/config_"+config.name+".js", {root: directory_client});
        });

        passport.serializeUser(function(user_id, done) {
            done(null, user_id);
        });
        passport.deserializeUser(function(user_id, done) {
            done(null, user_id);
        });
    }

    run() {
        this.httpServer.listen(process.env.PORT || config.port);
    }

    public getHttpServer() {
      return this.httpServer;
    }

    
};
