import * as express from "express";
import * as validator from "express-validator";
import * as db from "../../util/db";
import Log from "../../util/log";
const router = express.Router();

router.use(validator());

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

router.post("/", function (req, res) {

  req.checkBody("username", "Username field cannot be empty.").notEmpty();
  req.checkBody("username", "Username must be between 4-15 characters long.").isLength({min:4, max:15});
  req.checkBody("email", "The email you entered is invalid, please try again.").isEmail();
  req.checkBody("password", "Password must be between 8-100 characters long.").isLength({min:8, max:100});
  req.checkBody("passwordRepeat", "Password must be between 8-100 characters long.").isLength({min:8, max:100});
  req.checkBody("passwordRepeat", "Passwords do not match, please try again.").equals(req.body.password);
  req.checkBody("username", "Username can only contain letters, numbers, or underscores.").matches(/^[A-Za-z0-9_-]+$/, "i");

  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const passwordRepeat = req.body.passwordRepeat;

  const validationErrors = req.validationErrors();

  if (validationErrors) {
    const errorsString = JSON.stringify(validationErrors);
    Log.error(errorsString);
    res.send(errorsString);
  } else {
    Log.info("Registration: Username=" + username + "\nE-Mail=" + email + "\nPassword=" + password + "\nPassword2=" + passwordRepeat);

    db.queryWithValues("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, password], function (error, results, fields) {
      if (error) {
        Log.error(error);
        res.send(error);
      } else {
        res.send("Reg complete");
      }
    });
  }


});

export default router;
