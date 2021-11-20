import * as http from "http"
import express from "express"
import cookieParser from "cookie-parser"
import path from "path"
import bodyParser from "body-parser"
import * as admin from "firebase-admin"
import * as auth from "./auth"
import Log from "../util/log"

import router_register from "./routes/register"
import router_login from "./routes/login"
import router_logout from "./routes/logout"
import router_play from "./routes/play"
import router_mapgen from "./routes/mapgen"
import GameServer from "../game/gameserver"
import { Config } from "../main"

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

const publicFolder = path.join(__dirname, "../../client/public")

export default class Webserver {
  private app = express()
  private httpServer: http.Server = http.createServer(this.app)

  constructor(gameserver: GameServer) {
    this.app.set("gameserver", gameserver)
    this.app.use(cookieParser())
    this.app.use(bodyParser.urlencoded({ extended: true }))
    this.app.use(bodyParser.json())

    console.log(path.join(__dirname, "../../client/public"))
    this.app.use(
      express.static(publicFolder, { index: false, extensions: ["html"] })
    )
    this.app.use("/register", router_register)
    // this.app.use("/login", router_login)
    // this.app.use("/logout", router_logout)
    this.app.use("/mapgen", router_mapgen)
    this.app.get("/", auth.isAuthenticated, (_req, res) => {
      res.sendFile("play.html", { root: publicFolder })
    })
  }

  run() {
    this.httpServer.listen(Config.port)
  }

  public getHttpServer() {
    return this.httpServer
  }
}
