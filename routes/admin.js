const express = require("express");
const {
    getAdmins,
    addAdmin,
    deleteAdmin,
    getCouriers,
    addCourier,
    updateCourier,
    deleteCourier,
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

// Admin Management
router.get("/admins", getAdmins);
router.post("/admins", addAdmin);
router.delete("/admins/:id", deleteAdmin);

// Courier Management
router.get("/couriers", getCouriers);
router.post("/couriers", addCourier);
router.put("/couriers/:id", updateCourier);
router.delete("/couriers/:id", deleteCourier);

// Seller Management
router.get("/sellers/pending", getPendingSellers);
router.put("/sellers/:id", approveSeller);
router.delete("/sellers/:id", deleteSeller);

// Buyer Management
router.delete("/buyers/:id", deleteBuyer);

module.exports = router;