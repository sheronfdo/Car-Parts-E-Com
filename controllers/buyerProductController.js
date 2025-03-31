const Product = require("../models/Product");
const User = require("../models/User");

// Get all active products (with pagination)
exports.getAllProducts = async (req, res) => {
    const { page = 1, limit = 10, category } = req.query;
    const query = { status: "active" };
    if (category) query.category = category;

    try {
        const products = await Product.find(query)
            .populate("category", "name")
            .populate("sellerId", "storeName region")
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            data: products,
            pagination: { page: parseInt(page), limit: parseInt(limit), total }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Search products with all filters (updated)
exports.searchProducts = async (req, res) => {
    const {
        keyword, minPrice, maxPrice, condition, brand, oem, aftermarket,
        availability, make, model, years, material, sellerLocation
    } = req.query;

    const query = { status: "active" };

    // Keyword search on title
    if (keyword) query.title = { $regex: keyword, $options: "i" };

    // Price range
    if (minPrice || maxPrice) query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);

    // Condition
    if (condition) query.condition = condition;

    // Brand
    if (brand) query.brand = { $regex: brand, $options: "i" };

    // OEM/Aftermarket
    if (oem) query.oem = { $regex: oem, $options: "i" };
    if (aftermarket !== undefined) query.aftermarket = aftermarket === "true";

    // Availability
    if (availability) query.availability = availability;

    // Vehicle Make & Model (using $elemMatch for array of objects)
    if (make || model) {
        query.makeModel = { $elemMatch: {} };
        if (make) query.makeModel.$elemMatch.make = { $regex: make, $options: "i" };
        if (model) query.makeModel.$elemMatch.model = { $regex: model, $options: "i" };
    }

    // Year of Manufacture
    if (years) {
        const yearArray = years.split(",").map(Number);
        query.years = { $in: yearArray };
    }

    // Material
    if (material) query.material = { $regex: material, $options: "i" };

    // Seller Location
    if (sellerLocation) {
        const sellers = await User.find({
            region: { $regex: sellerLocation, $options: "i" },
            role: "seller"
        }).select("_id");
        query.sellerId = { $in: sellers.map(s => s._id) };
    }

    try {
        const products = await Product.find(query)
            .populate("category", "name")
            .populate("sellerId", "storeName region");
        res.json({ success: true, data: products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get product by ID
exports.getProductById = async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findOne({ _id: id, status: "active" })
            .populate("category", "name")
            .populate("sellerId", "storeName region");
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or deleted" });
        }
        res.json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};