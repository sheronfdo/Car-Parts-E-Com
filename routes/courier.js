const express = require("express");
const router = express.Router();
const {
    getCourierOrders,
    getCourierOrderById,
    updateCourierStatus,
    reportDeliveryIssue,
    getCourierDashboard
} = require("../controllers/courierController");
const authMiddleware = require("../middleware/auth");

const courierAuth = (req, res, next) => {
    if (req.user.role !== "courier") {
        return res.status(403).json({ success: false, message: "Access denied, couriers only" });
    }
    next();
};

router.get("/orders", authMiddleware, courierAuth, getCourierOrders);
router.get("/order/:id", authMiddleware, courierAuth, getCourierOrderById);
router.put("/order/:id/status", authMiddleware, courierAuth, updateCourierStatus);
router.post("/order/:id/report-issue", authMiddleware, courierAuth, reportDeliveryIssue);
router.get("/dashboard", authMiddleware, courierAuth, getCourierDashboard);

module.exports = router;