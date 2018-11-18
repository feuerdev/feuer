import * as express from "express";
const router = express.Router();

//Route: /login/

router.get("/", function(req, res) {
  res.render("login");
});

router.post("/", function(req, res) {
  //Not needed. Logout will be handled on the client side
});

export default router;
