/**
 * Diese Klasse behandelt den HttpServer
 */
import config from "../util/config";
import * as http from "http";
import * as express from "express";
import * as express_handlebars from "express-handlebars";
import * as cookieParser from "cookie-parser";
import * as path from "path";
import * as bodyParser from "body-parser";
import * as admin from 'firebase-admin';
import * as auth from "../util/auth";
import Log from "../util/log";

import router_register from "./routes/register";
import router_login from "./routes/login";
import router_logout from "./routes/logout";
import router_home from "./routes/home";
import router_play from "./routes/play";

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
        this.app.use("/", router_home);
        this.app.use("/play", auth.isAuthenticated, router_play);

        this.app.get("/relogin", function (req, res) {
            res.render("relogin");
        });

        this.app.get("/config.js", function (req, res) {
            res.sendFile("/js/config/config_" + config.name + ".js", { root: directory_client });
        });
    }

    run() {
        this.httpServer.listen(process.env.PORT || config.port);
    }

    public getHttpServer() {
        return this.httpServer;
    }
};
