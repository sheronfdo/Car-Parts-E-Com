const express = require("express");
const {addCourier} = require("../controllers/adminController");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

const router = express.Router();

// Protect routes with authentication and role check
router.use(auth);
router.use(checkRole("admin"));

// Add a courier
router.post("/add-courier", addCourier);

module.exports = router;