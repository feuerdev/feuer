import * as express from "express";
import * as admin from 'firebase-admin';
import * as db from "../../util/db";
import * as auth from "../../util/auth";
const router = express.Router();

//TODO: outsource firebase admin in separate import

//Route: /register/
router.get("/", function (req, res) {
  res.render("register");
});

router.post("/", auth.deserializeAuth, function (req, res) {
  const username = req.body.username;
  console.log("Registration: Username=" + username);

  if (req.user) {
    db.queryWithValues("INSERT INTO users (username, email, uid) VALUES (?, ?, ?)", [username, req.user.email, req.user.uid], function (error, results, fields) {
      if (error) {
        console.log(error);
        res.status(400).send(error);
      } else {
        console.log(results);
        res.sendStatus(200);
      }
    });
  } else {
    res.send("Error: No session cookie set");
  }

});

export default router;
