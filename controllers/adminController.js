const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const bcrypt = require("bcryptjs");

exports.getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: "admin", status: "active" });
        res.json({ success: true, data: admins });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addAdmin = async (req, res) => {
    const { email, password, name, phone } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new User({
            email,
            password: hashedPassword,
            role: "admin",
            name,
            phone,
            status: "active"
        });
        await admin.save();

        res.status(201).json({
            success: true,
            data: { adminId: admin._id }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        const admin = await User.findById(id);
        if (!admin || admin.role !== "admin") {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Prevent deleting the last admin
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
            return res.status(403).json({ success: false, message: "Cannot delete the last admin" });
        }
        admin.status = "deleted";
        admin.updatedAt = Date.now();
        await admin.save();
        res.json({ success: true, message: "Admin deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Courier Management ---
exports.getCouriers = async (req, res) => {
    try {
        const couriers = await User.find({ role: "courier", status: "active" });
        res.json({ success: true, data: couriers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addCourier = async (req, res) => {
    const { email, password, name, phone, region } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const courier = new User({
            email,
            password: hashedPassword,
            role: "courier",
            name,
            phone,
            region,
            availability: "active",
            status: "active"
        });
        await courier.save();

        res.status(201).json({
            success: true,
            data: { courierId: courier._id }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateCourier = async (req, res) => {
    const { id } = req.params;
    const { name, phone, region, availability } = req.body;

    try {
        const courier = await User.findById(id);
        if (!courier || courier.role !== "courier") {
            return res.status(404).json({ success: false, message: "Courier not found" });
        }

        courier.name = name || courier.name;
        courier.phone = phone || courier.phone;
        courier.region = region || courier.region;
        courier.availability = availability || courier.availability;
        courier.updatedAt = Date.now();
        await courier.save();

        res.json({ success: true, message: "Courier updated", data: { courierId: courier._id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteCourier = async (req, res) => {
    const { id } = req.params;

    try {
        const courier = await User.findById(id);
        if (!courier || courier.role !== "courier") {
            return res.status(404).json({ success: false, message: "Courier not found" });
        }
        courier.status = "deleted";
        courier.updatedAt = Date.now();
        await courier.save();
        res.json({ success: true, message: "Courier deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllSellers = async (req, res) => {
    try {
        const sellers = await User.find({ role: "seller", status: "active" });
        res.json({ success: true, data: sellers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPendingSellers = async (req, res) => {
    try {
        const pendingSellers = await User.find({ role: "seller", status: "pending" });
        res.json({ success: true, data: pendingSellers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.approveSeller = async (req, res) => {
    const { id } = req.params;
    try {
        const seller = await User.findById(id);
        if (!seller || seller.role !== "seller") {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }
        if (seller.status === "active") {
            return res.status(400).json({ success: false, message: "Seller already approved" });
        }
        seller.status = "active";
        seller.updatedAt = Date.now();
        await seller.save();
        res.json({ success: true, message: "Seller approved", data: { sellerId: seller._id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteSeller = async (req, res) => {
    const { id } = req.params;
    try {
        const seller = await User.findById(id);
        if (!seller || seller.role !== "seller") {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }
        seller.status = "deleted";
        seller.updatedAt = Date.now();
        await seller.save();
        res.json({ success: true, message: "Seller deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllBuyers = async (req, res) => {
    try {
        const buyers = await User.find({ role: "buyer", status: "active" });
        res.json({ success: true, data: buyers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteBuyer = async (req, res) => {
    const { id } = req.params;
    try {
        const buyer = await User.findById(id);
        if (!buyer || buyer.role !== "buyer") {
            return res.status(404).json({ success: false, message: "Buyer not found" });
        }
        buyer.status = "deleted";
        buyer.updatedAt = Date.now();
        await buyer.save();
        res.json({ success: true, message: "Buyer deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAdminAnalytics = async (req, res) => {
    try {
        // Total orders and revenue
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $match: { status: "Delivered" } },
            { $group: { _id: null, total: { $sum: "$total" } } }
        ]);

        // Users by role
        const usersByRole = await User.aggregate([
            { $match: { status: "active" } },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Order status breakdown
        const orderStatusBreakdown = await Order.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // Top-selling products
        const topProducts = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { "items.sellerStatus": "Delivered" } },
            { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } } },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
            { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $project: { title: "$product.title", totalSold: 1, revenue: 1 } }
        ]);

        // Top sellers
        const topSellers = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { "items.sellerStatus": "Delivered" } },
            { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $group: { _id: "$product.sellerId", revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "seller" } },
            { $unwind: "$seller" },
            { $project: { name: "$seller.name", storeName: "$seller.storeName", revenue: 1 } }
        ]);

        // Courier performance
        const courierPerformance = await Order.aggregate([
            { $match: { "courierDetails.courierId": { $ne: null } } },
            { $group: {
                    _id: "$courierDetails.courierId",
                    delivered: { $sum: { $cond: [{ $eq: ["$courierStatus", "Delivered"] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ["$courierStatus", "Failed Delivery"] }, 1, 0] } }
                } },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "courier" } },
            { $unwind: "$courier" },
            { $project: { name: "$courier.name", delivered: 1, failed: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                usersByRole: Object.fromEntries(usersByRole.map(r => [r._id, r.count])),
                orderStatusBreakdown: Object.fromEntries(orderStatusBreakdown.map(s => [s._id, s.count])),
                topProducts,
                topSellers,
                courierPerformance
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const { status, startDate, endDate, district } = req.query;

        // Build query object
        const query = {};
        if (status) query.status = status;
        if (district) query["shippingAddress.district"] = district;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const orders = await Order.find(query)
            .populate("buyerId", "name email phone")
            .populate("items.productId", "title price brand condition images")
            .populate("courierDetails.courierId", "name phone region");

        res.status(200).json({
            success: true,
            data: orders
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const { status, category, sellerId } = req.query;

        // Build query object
        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;
        if (sellerId) query.sellerId = sellerId;

        const products = await Product.find(query)
            .populate("category", "name")
            .populate("sellerId", "name email storeName");

        res.status(200).json({
            success: true,
            data: products
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};