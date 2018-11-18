import * as express from "express";
const router = express.Router();

//Route: /register/
router.get("/", function (req, res) {
  res.render("register");
});

router.post("/", function (req, res) {
  //Not needed. Registration will be handled on the client side
});

export default router;
