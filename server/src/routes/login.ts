import * as express from "express";
import * as db from "../util/db";
const router = express.Router();

//Route: /login/

router.get("/", function(req, res) {
  res.send(`
    <h1>Login</h1>
    <form method="POST" action="/login">
     Username: <input type="text" name="username"><br>
     Password: <input type="password" name="password"><br>
      <input type="submit" value="Login">
    </form>
  `)
});

router.post("/", function(req, res) {
  //TODO
});

/* old:
 this.app.get("/login", function(req, res) {
  res.sendFile("login.html", {root: directory_client});
 });
*/
export default router;
