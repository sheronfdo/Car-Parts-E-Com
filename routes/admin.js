const express = require("express");
const {
    addCourier,
    getPendingSellers,
    approveSeller,
    deleteSeller,
    deleteBuyer
} = require("../controllers/adminController");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

const router = express.Router();

// Protect routes with authentication and role check
router.use(auth);
router.use(checkRole("admin"));

// Add a courier
router.post("/add-courier", addCourier);
router.get("/sellers/pending", getPendingSellers);
router.put("/sellers/:id", approveSeller);
router.delete("/sellers/:id", deleteSeller);
router.delete("/buyers/:id", deleteBuyer);

module.exports = router;