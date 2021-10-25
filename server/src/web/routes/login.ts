import * as express from "express"
const router = express.Router()
import path from "path"
const directory_client = path.join(__dirname, "../../../../client") //Gibt das Client-Root-Verzeichnis zurueck.;

//Route: /login/
router.get("/", function (req, res) {
  res.sendFile("login.html", { root: directory_client })
})

router.post("/", function (req, res) {
  //Not needed. Logout will be handled on the client side
})

export default router
