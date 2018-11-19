import * as express from "express";
const router = express.Router();

//Route: /

router.get("/", function(req, res) {
  res.render("home", {username: req.user.game.username});
});



export default router;
