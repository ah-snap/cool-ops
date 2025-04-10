const { Router } = require("express");
const { DealerController } = require("../controllers/dealers.js");

function BuildRouter(db) {
    DealerController.db = db;
    const router = new Router();
    router.get("/api/v1/dealers/:dCode", DealerController.getDealer);
    router.put("/api/v1/dealers/:dCode", DealerController.updateDealer);
    return router;
}

module.exports = { BuildRouter };