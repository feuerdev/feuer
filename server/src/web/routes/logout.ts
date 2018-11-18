import * as express from "express";
const router = express.Router();

//Route: /login/

router.get("/", function(req, res) {
  res.render("logout");
});

router.post("/", function(req, res) {
  //Not needed. Login will be handled on the client side
});

export default router;
