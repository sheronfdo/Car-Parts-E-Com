const express = require("express");
const {
    getAllProducts,
    searchProducts,
    getProductById,
    getProductFilterOptions
} = require("../controllers/buyerProductController");
const {
    addToCart,
    removeFromCart,
    getCart,
    clearCart
} = require("../controllers/cartController");
const {
    createOrder,
    notifyOrder,
    getOrders,
    cancelOrder,
    trackOrder,
    saveAddress
} = require("../controllers/orderController");
const { submitComplaint } = require("../controllers/complaintController");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/products", getAllProducts);
router.get("/products/search", searchProducts);
router.get("/products/:id", getProductById);

router.get("/product-filter-options", getProductFilterOptions);

router.post("/order/notify", notifyOrder);

// Protected cart routes (buyer only)
router.use(auth);
router.use(checkRole("buyer"));
router.post("/cart/add", addToCart);
router.delete("/cart/remove/:productId", removeFromCart);
router.get("/cart", getCart);
router.delete("/cart/clear", clearCart);

router.post("/order", createOrder);
router.get("/orders", getOrders);
router.post("/order/cancel/:id", cancelOrder);
router.get("/order/track/:id", trackOrder);
router.post("/address", saveAddress);

// Complaint route
router.post("/order/:orderId/complaint", submitComplaint);

module.exports = router;