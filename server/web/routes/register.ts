import * as express from "express"
import * as auth from "../auth"
import path from "path"
import { getDb } from "../../util/db"

const directory_client = path.join(__dirname, "../../../../../client") //Gibt das Client-Root-Verzeichnis zurueck.;
const router = express.Router()

//Route: /register/
router.get("/", function (_req, res) {
  res.sendFile("register.html", { root: directory_client })
})

router.post("/", auth.deserializeAuth, async function (req, res) {
  const db = await getDb()

  const username = req.body.username
  const user = (req as any).user

  if (!user) {
    res.send("Error: No session cookie set")
  }

  await db.collection("users").insertOne({
    uid: user.uid,
    username: username,
    email: user.email,
  })

  res.sendStatus(200)
})

export default router
