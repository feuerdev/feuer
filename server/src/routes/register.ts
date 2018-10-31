import * as express from "express";
import * as db from "../util/db";
const router = express.Router();

//Route: /register/
router.get("/", function (req, res) {
  res.send(`
    <h1>Register</h1>
    <form method="POST" action="/register">
      Username: <input type="text" name="username"><br>
      E-Mail: <input type="text" name="email"><br>
      Password: <input type="password" name="password"><br>
      Repeat Password: <input type="password" name="passwordRepeat"><br>
      <input type="submit" value="Register">
    </form>`)
});

router.post("/", function(req, res) {

  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const passwordRepeat = req.body.passwordRepeat;
  console.log({username, email, password, passwordRepeat});
  console.log(db.query("SELECT 1 + 1 AS solution"));
  res.send("Reg complete");
});

/* old:
 this.app.get("/register", function(req, res) {
  res.sendFile("register.html", {root: directory_client});
 });
*/
export default router;
