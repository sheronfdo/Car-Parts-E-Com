const express = require("express");
const {
    getAllProducts,
    searchProducts,
    getProductById
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
} = require("../controllers/orderController");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

router.get("/products", getAllProducts);
router.get("/products/search", searchProducts);
router.get("/products/:id", getProductById);


// Protected cart routes (buyer only)
router.use(auth);
router.use(checkRole("buyer"));
router.post("/cart/add", addToCart);
router.delete("/cart/remove/:productId", removeFromCart);
router.get("/cart", getCart);
router.delete("/cart/clear", clearCart);

router.post("/order", createOrder);
router.post("/order/notify", notifyOrder);
router.get("/orders", getOrders);

module.exports = router;