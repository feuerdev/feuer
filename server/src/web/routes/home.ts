import * as express from "express";
import * as db from "../../util/db";
import * as auth from "../../util/auth";
const router = express.Router();

//Route: /

router.get("/", [auth.isAuthenticated, auth.deserializeAuthGame], function (req, res) {
  db.query("SELECT users.username as 'killer', COUNT(*) AS 'kills' FROM kills JOIN users ON kills.killer=users.uid GROUP BY killer", function (error, results, fields) {
    if (error) {
      console.log(error);
    } else {
      let leaderboardItems = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        leaderboardItems.push({
          killer: result.killer,
          kills: result.kills
        });
      }
      res.render("home", {
        username: req.user.game.username,
        leaderboardItems: leaderboardItems
      });
    }
  });
});



export default router;
