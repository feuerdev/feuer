import * as express from "express";
const router = express.Router();

router.get("/", function(req, res) {
    console.log("Hi from gamerouter");
});

export default router;