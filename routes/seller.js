const express = require("express");
const {
    createProduct,
    getSellerProducts,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");

const router = express.Router();

router.use(auth);
router.use(checkRole("seller"));

router.post("/products", createProduct);
router.get("/products", getSellerProducts);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

module.exports = router;