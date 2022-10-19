import * as express from "express"
import GameServer from "../../game/gameserver"
import path from "path"
import { generateWorld } from "../../game/mapgen"

const router = express.Router()
const directory_client = path.join(__dirname, "../../../../../client") //Gibt das Client-Root-Verzeichnis zurueck.;

//Route: /mapgen
router.get("/", function (_req, res) {
  res.sendFile("mapgen.html", { root: directory_client })
})

router.post("/generate", function (req, res) {
  const params = req.body
  let gameserver: GameServer = req.app.get("gameserver")
  gameserver.setWorld(
    generateWorld(params.seed, params.size, params.frequency, params.amplitude, params.min, params.max, params.octaves, params.persistence)
  )
  res.sendStatus(200)
})

export default router
