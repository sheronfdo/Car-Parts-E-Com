const express = require("express");
const {
    getAllProducts,
    searchProducts,
    getProductById
} = require("../controllers/buyerProductController");

const router = express.Router();

router.get("/products", getAllProducts);
router.get("/products/search", searchProducts);
router.get("/products/:id", getProductById);

module.exports = router;