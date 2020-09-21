import * as express from "express";
import path from "path";

const router = express.Router();
const directory_client = path.join(__dirname, "../../../../client"); //Gibt das Client-Root-Verzeichnis zurueck.;

//Route: /play
router.get("/", function(req, res) {
  res.sendFile("play.html", { root: directory_client });
});

export default router;
