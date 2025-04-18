const express = require("express");
const {
    createProduct, getSellerProducts, updateProduct, deleteProduct
} = require("../controllers/productController");
const {
    getSellerOrders, getSellerOrderById, updateOrderStatus, handoverToCourier, getSellerAnalytics
} = require("../controllers/sellerController");
const { resolveComplaint } = require("../controllers/complaintController");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");
const {getAllCategories} = require("../controllers/categoryController");

const router = express.Router();

router.use(auth);
router.use(checkRole("seller"));

router.post("/products", createProduct);
router.get("/products", getSellerProducts);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

router.get("/orders", getSellerOrders);
router.get("/order/:id", getSellerOrderById);
router.put("/order/:id/status", updateOrderStatus);
router.put("/order/:id/handover", handoverToCourier);

// Complaint route
router.post("/order/:orderId/complaint/resolve", resolveComplaint);

router.get("/categories", getAllCategories);

router.get("/analytics", getSellerAnalytics);

module.exports = router;