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
import Log from "../util/log";

import router_register from "./routes/register";
import router_login from "./routes/login";
import router_logout from "./routes/logout";

const directory_client = path.join(__dirname, "../../../client"); //Gibt das Client-Root-Verzeichnis zurueck.;

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FB_project_id,
        clientEmail: process.env.FB_client_email,
        privateKey: process.env.FB_private_key.replace(/\\n/g, '\n')
    }),
    databaseURL: 'https://feuer-io.firebaseio.com'
});

const isAuthenticated = function (req, res, next) {
    if (req.cookies) {
        const idToken = req.cookies.__session;
        if (idToken) {
            admin.auth().verifyIdToken(idToken)
                .then(decodedToken => {
                    console.log(decodedToken);
                    console.log("IdToken is valid");
                    next();
                })
                .catch(error => {
                    console.log(error);
                    res.redirect("/login");
                });
        } else {
            res.redirect("/login");
        }
    } else {
        res.redirect("/login");
    }
}

export default class Webserver {

    private app = express();
    private httpServer: http.Server = http.createServer(this.app);

    constructor() {
        this.app.engine("hbs", express_handlebars({ extname: ".hbs" }));
        this.app.set("views", path.join(directory_client, "views"));
        this.app.set("view engine", "hbs");
        this.app.use(cookieParser());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
        this.app.use(express.static(directory_client, { index: false }));

        this.app.use("/register", router_register);
        this.app.use("/login", router_login);
        this.app.use("/logout", router_logout);

        this.app.get("/", isAuthenticated, function (req, res) {
            Log.debug(JSON.stringify(req.user));
            res.render("home", {username: req.user.username});
        });

        this.app.get("/play", isAuthenticated, function (req, res) {
            Log.debug(JSON.stringify(req.user));
            res.render("play");
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
