import * as http from "http"
import express from "express"
import express_handlebars from "express-handlebars"
import cookieParser from "cookie-parser"
import path from "path"
import bodyParser from "body-parser"
import * as admin from "firebase-admin"
import * as auth from "../util/auth"
import Log from "../util/log"

import router_register from "./routes/register"
import router_login from "./routes/login"
import router_logout from "./routes/logout"
import router_home from "./routes/home"
import router_play from "./routes/play"
import router_mapgen from "./routes/mapgen"
import GameServer from "../game/gameserver"
import { Config } from "../main"

const directory_client = path.join(__dirname, "../../../../client") //Gibt das Client-Root-Verzeichnis zurueck.;

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: Config.firebaseProjectId,
      clientEmail: Config.firebaseClientEmail,
      privateKey: Config.fbKey.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://feuer-io.firebaseio.com",
  })
} catch (error) {
  Log.error(error)
  Log.error("Did you forget to create the .env file?")
}

export default class Webserver {
  private app = express()
  private httpServer: http.Server = http.createServer(this.app)

  constructor(gameserver: GameServer) {
    this.app.set("gameserver", gameserver)
    this.app.engine(
      "hbs",
      express_handlebars({ extname: ".hbs", defaultLayout: null })
    )
    this.app.set("views", path.join(directory_client, "views"))
    this.app.set("view engine", "hbs")
    this.app.use(cookieParser())
    this.app.use(bodyParser.urlencoded({ extended: true }))
    this.app.use(bodyParser.json())
    this.app.use(express.static(directory_client, { index: false }))

    this.app.use("/register", router_register)
    this.app.use("/login", router_login)
    this.app.use("/logout", router_logout)
    this.app.use("/mapgen", router_mapgen)
    this.app.get("/relogin", function (req, res) {
      res.sendFile("relogin.html", { root: directory_client })
    })
    this.app.use("/play", auth.isAuthenticated, router_play)
    this.app.get("/config", function (req, res) {
      res.send(Config) //TODO: only send relevant values and use better naming on client side to tell apart server and client config
    })
    this.app.use("/", auth.isAuthenticated, router_play)
  }

  run() {
    this.httpServer.listen(Config.port)
  }

  public getHttpServer() {
    return this.httpServer
  }
}
