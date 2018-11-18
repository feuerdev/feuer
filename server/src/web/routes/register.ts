import * as express from "express";
import * as validator from "express-validator";
import * as bcrypt from "bcryptjs";
import * as db from "../../util/db";
import Log from "../../util/log";
const router = express.Router();

router.use(validator());

//Route: /register/
router.get("/", function (req, res) {
  res.render("register");
});

router.post("/", function (req, res) {
  //Not needed. Registration will be handled on the client side
});

export default router;
