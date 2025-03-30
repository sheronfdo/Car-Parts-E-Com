const Product = require("../models/Product");

// Create a product
exports.createProduct = async (req, res) => {
    const {
        title, description, price, category, stock, condition, brand, oem, aftermarket,
        material, makeModel, years, images
    } = req.body;
    const sellerId = req.user.id;

    try {
        const product = new Product({
            title,
            description,
            price,
            category,
            stock,
            condition,
            brand,
            oem,
            aftermarket: aftermarket || false,
            material,
            makeModel: makeModel || [],
            years: years || [],
            availability: stock > 0 ? "In Stock" : "Pre-order",
            images,
            sellerId
        });
        await product.save();

        res.status(201).json({
            success: true,
            data: { productId: product._id, title }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all seller's products
exports.getSellerProducts = async (req, res) => {
    const sellerId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    try {
        const products = await Product.find({ sellerId, status: "active" })
            .populate("category", "name")
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Product.countDocuments({ sellerId, status: "active" });

        res.json({
            success: true,
            data: products,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update a product
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const {
        title, description, price, category, stock, condition, brand, oem, aftermarket,
        material, makeModel, years, images
    } = req.body;
    const sellerId = req.user.id;

    try {
        const product = await Product.findOne({ _id: id, sellerId });
        if (!product || product.status === "deleted") {
            return res.status(404).json({ success: false, message: "Product not found or deleted" });
        }

        product.title = title || product.title;
        product.description = description || product.description;
        product.price = price || product.price;
        product.category = category || product.category;
        product.stock = stock !== undefined ? stock : product.stock;
        product.condition = condition || product.condition;
        product.brand = brand || product.brand;
        product.oem = oem || product.oem;
        product.aftermarket = aftermarket !== undefined ? aftermarket : product.aftermarket;
        product.material = material || product.material;
        product.makeModel = makeModel || product.makeModel;
        product.years = years || product.years;
        product.availability = stock !== undefined ? (stock > 0 ? "In Stock" : "Pre-order") : product.availability;
        product.images = images || product.images;
        product.updatedAt = Date.now();

        await product.save();

        res.json({
            success: true,
            message: "Product updated",
            data: { productId: product._id, title: product.title }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete a product (soft delete)
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    const sellerId = req.user.id;

    try {
        const product = await Product.findOne({ _id: id, sellerId });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        if (product.status === "deleted") {
            return res.status(400).json({ success: false, message: "Product already deleted" });
        }

        product.status = "deleted";
        product.updatedAt = Date.now();
        await product.save();

        res.json({ success: true, message: "Product marked as deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};