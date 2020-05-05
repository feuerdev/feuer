/**
 * Diese Klasse behandelt den HttpServer
 */
import config from "../util/config";
import * as http from "http";
import express from "express";
import express_handlebars from "express-handlebars";
import cookieParser from "cookie-parser";
import path from "path";
import bodyParser from "body-parser";
import * as admin from 'firebase-admin';
import * as auth from "../util/auth";
import Log from "../util/log";

import router_register from "./routes/register";
import router_login from "./routes/login";
import router_logout from "./routes/logout";
import router_home from "./routes/home";
import router_play from "./routes/play";
import router_mapgen from "./routes/mapgen";
import GameServer from "../game/gameserver";

const directory_client = path.join(__dirname, "../../../client"); //Gibt das Client-Root-Verzeichnis zurueck.;

try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FB_project_id,
            clientEmail: process.env.FB_client_email,
            privateKey: process.env.FB_private_key.replace(/\\n/g, '\n')
        }),
        databaseURL: 'https://feuer-io.firebaseio.com'
    });
} catch (error) {
    Log.error("Did you forget to create the .env file?")
}

export default class Webserver {

    private app = express();
    private httpServer: http.Server = http.createServer(this.app);

    public gameserver:GameServer;

    constructor() {
        this.app.engine("hbs", express_handlebars({ extname: ".hbs", defaultLayout: null }));
        this.app.set("views", path.join(directory_client, "views"));
        this.app.set("view engine", "hbs");
        this.app.use(cookieParser());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(express.static(directory_client, { index: false }));

        this.app.use("/register", router_register);
        this.app.use("/login", router_login);
        this.app.use("/logout", router_logout);
        this.app.use("/mapgen", router_mapgen);
        this.app.get("/relogin", function (req, res) {
            res.render("relogin");
        });
        this.app.use("/play", auth.isAuthenticated, router_play);
        this.app.get("/config.js", function (req, res) {
            res.sendFile("/js/config/config_" + config.name + ".js", { root: directory_client });
        });
        this.app.use("/", auth.isAuthenticated, router_play);//this.app.use("/", router_home);
    }

    run() {
        this.httpServer.listen(process.env.PORT || config.port);
        this.app.set('gameserver', this.gameserver);
    }

    public getHttpServer() {
        return this.httpServer;
    }
};
