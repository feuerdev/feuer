import * as express from "express";
const router = express.Router();

//Route: /play

router.get("/", function(req, res) {
  res.render("play");
});

export default router;
