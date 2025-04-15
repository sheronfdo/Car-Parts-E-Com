const mongoose = require("mongoose");
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

// exports.getAdminAnalytics = async (req, res) => {
//     try {
//         // Total orders and revenue
//         const totalOrders = await Order.countDocuments();
//         const totalRevenue = await Order.aggregate([
//             { $match: { status: "Delivered" } },
//             { $group: { _id: null, total: { $sum: "$total" } } }
//         ]);

//         // Users by role
//         const usersByRole = await User.aggregate([
//             { $match: { status: "active" } },
//             { $group: { _id: "$role", count: { $sum: 1 } } }
//         ]);

//         // Order status breakdown
//         const orderStatusBreakdown = await Order.aggregate([
//             { $group: { _id: "$status", count: { $sum: 1 } } }
//         ]);

//         // Top-selling products
//         const topProducts = await Order.aggregate([
//             { $unwind: "$items" },
//             { $match: { "items.sellerStatus": "Delivered" } },
//             { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } } },
//             { $sort: { totalSold: -1 } },
//             { $limit: 5 },
//             { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
//             { $unwind: "$product" },
//             { $project: { title: "$product.title", totalSold: 1, revenue: 1 } }
//         ]);

//         // Top sellers
//         const topSellers = await Order.aggregate([
//             { $unwind: "$items" },
//             { $match: { "items.sellerStatus": "Delivered" } },
//             { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product" } },
//             { $unwind: "$product" },
//             { $group: { _id: "$product.sellerId", revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } } },
//             { $sort: { revenue: -1 } },
//             { $limit: 5 },
//             { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "seller" } },
//             { $unwind: "$seller" },
//             { $project: { name: "$seller.name", storeName: "$seller.storeName", revenue: 1 } }
//         ]);

//         // Courier performance
//         const courierPerformance = await Order.aggregate([
//             { $match: { "courierDetails.courierId": { $ne: null } } },
//             { $group: {
//                     _id: "$courierDetails.courierId",
//                     delivered: { $sum: { $cond: [{ $eq: ["$courierStatus", "Delivered"] }, 1, 0] } },
//                     failed: { $sum: { $cond: [{ $eq: ["$courierStatus", "Failed Delivery"] }, 1, 0] } }
//                 } },
//             { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "courier" } },
//             { $unwind: "$courier" },
//             { $project: { name: "$courier.name", delivered: 1, failed: 1 } }
//         ]);

//         res.status(200).json({
//             success: true,
//             data: {
//                 totalOrders,
//                 totalRevenue: totalRevenue[0]?.total || 0,
//                 usersByRole: Object.fromEntries(usersByRole.map(r => [r._id, r.count])),
//                 orderStatusBreakdown: Object.fromEntries(orderStatusBreakdown.map(s => [s._id, s.count])),
//                 topProducts,
//                 topSellers,
//                 courierPerformance
//             }
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };


exports.getAdminAnalytics = async (req, res) => {
    try {
        // Step 1: Main aggregation pipeline for order and item-level metrics
        const orderAnalytics = await Order.aggregate([
            // Unwind items for item-level analysis
            { $unwind: "$items" },
            // Facet to compute multiple metrics
            {
                $facet: {
                    // Total orders (count of items)
                    totalOrders: [{ $count: "count" }],
                    // Total revenue (based on items with sellerStatus: "Delivered")
                    totalRevenue: [
                        { $match: { "items.sellerStatus": "Delivered" } },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
                            }
                        }
                    ],
                    // Seller status breakdown
                    sellerStatusBreakdown: [
                        {
                            $group: {
                                _id: "$items.sellerStatus",
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                status: "$_id",
                                count: 1
                            }
                        }
                    ],
                    // Courier status breakdown
                    courierStatusBreakdown: [
                        {
                            $group: {
                                _id: "$items.courierStatus",
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                status: "$_id",
                                count: 1
                            }
                        }
                    ],
                    // Top-selling products
                    topProducts: [
                        { $match: { "items.sellerStatus": "Delivered" } },
                        {
                            $group: {
                                _id: "$items.productId",
                                totalSold: { $sum: "$items.quantity" },
                                revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
                            }
                        },
                        { $sort: { totalSold: -1 } },
                        { $limit: 5 },
                        {
                            $lookup: {
                                from: "products",
                                localField: "_id",
                                foreignField: "_id",
                                as: "product"
                            }
                        },
                        { $unwind: "$product" },
                        {
                            $project: {
                                _id: 0,
                                title: "$product.title",
                                itemPrice: "$product.price",
                                categoryId: "$product.categoryId",
                                categoryName: "$product.categoryName",
                                presentStock: "$product.stock",
                                make: "$product.make",
                                model: "$product.model",
                                totalSold: 1,
                                revenue: 1
                            }
                        }
                    ],
                    // Top sellers
                    topSellers: [
                        { $match: { "items.sellerStatus": "Delivered" } },
                        {
                            $lookup: {
                                from: "products",
                                localField: "items.productId",
                                foreignField: "_id",
                                as: "product"
                            }
                        },
                        { $unwind: "$product" },
                        {
                            $group: {
                                _id: "$product.sellerId",
                                totalEarnings: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
                            }
                        },
                        { $sort: { totalEarnings: -1 } },
                        { $limit: 5 },
                        {
                            $lookup: {
                                from: "users",
                                localField: "_id",
                                foreignField: "_id",
                                as: "seller"
                            }
                        },
                        { $unwind: "$seller" },
                        {
                            $project: {
                                _id: 0,
                                name: "$seller.name",
                                storeName: "$seller.storeName",
                                email: "$seller.email",
                                phone: "$seller.phone",
                                totalEarnings: 1
                            }
                        }
                    ],
                    // Courier performance
                    courierPerformance: [
                        { $match: { "items.courierDetails.courierId": { $ne: null } } },
                        {
                            $group: {
                                _id: "$items.courierDetails.courierId",
                                delivered: {
                                    $sum: { $cond: [{ $eq: ["$items.courierStatus", "Delivered"] }, 1, 0] }
                                },
                                failed: {
                                    $sum: { $cond: [{ $eq: ["$items.courierStatus", "Failed Delivery"] }, 1, 0] }
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "_id",
                                foreignField: "_id",
                                as: "courier"
                            }
                        },
                        { $unwind: "$courier" },
                        {
                            $project: {
                                _id: 0,
                                name: "$courier.name",
                                delivered: 1,
                                failed: 1
                            }
                        }
                    ]
                }
            }
        ]);

        // Step 2: Users by role (unchanged, not related to items)
        const usersByRole = await User.aggregate([
            { $match: { status: "active" } },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        // Step 3: Order status breakdown (optional, kept for order-level context)
        const orderStatusBreakdown = await Order.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        // Step 4: Format the response
        res.status(200).json({
            success: true,
            data: {
                totalOrders: orderAnalytics[0].totalOrders[0]?.count || 0,
                totalRevenue: orderAnalytics[0].totalRevenue[0]?.total || 0,
                usersByRole: Object.fromEntries(usersByRole.map(r => [r._id, r.count])),
                orderStatusBreakdown: Object.fromEntries(orderStatusBreakdown.map(s => [s._id, s.count])),
                sellerStatusBreakdown: Object.fromEntries(
                    orderAnalytics[0].sellerStatusBreakdown.map(s => [s.status, s.count])
                ),
                courierStatusBreakdown: Object.fromEntries(
                    orderAnalytics[0].courierStatusBreakdown.map(s => [s.status, s.count])
                ),
                topProducts: orderAnalytics[0].topProducts,
                topSellers: orderAnalytics[0].topSellers,
                courierPerformance: orderAnalytics[0].courierPerformance
            }
        });
    } catch (err) {
        console.error(`Error in getAdminAnalytics:`, err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.getAllOrders = async (req, res) => {
//     try {
//         const { status, startDate, endDate, district } = req.query;

//         // Build query object
//         const query = {};
//         if (status) query.status = status;
//         if (district) query["shippingAddress.district"] = district;
//         if (startDate || endDate) {
//             query.createdAt = {};
//             if (startDate) query.createdAt.$gte = new Date(startDate);
//             if (endDate) query.createdAt.$lte = new Date(endDate);
//         }

//         const orders = await Order.find(query)
//             .populate("buyerId", "name email phone")
//             .populate("items.productId", "title price brand condition images")
//             .populate("courierDetails.courierId", "name phone region");

//         res.status(200).json({
//             success: true,
//             data: orders
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };



exports.getAllOrders = async (req, res) => {
    try {
        const { status, startDate, endDate, district, sellerStatus, courierStatus } = req.query;

        // Build order-level query
        const orderQuery = {};
        if (status) orderQuery.status = status;
        if (district) orderQuery["shippingAddress.district"] = district;
        if (startDate || endDate) {
            orderQuery.createdAt = {};
            if (startDate) orderQuery.createdAt.$gte = new Date(startDate);
            if (endDate) orderQuery.createdAt.$lte = new Date(endDate);
        }

        // Build item-level match conditions
        const itemMatch = {};
        if (sellerStatus) itemMatch["items.sellerStatus"] = sellerStatus;
        if (courierStatus) itemMatch["items.courierStatus"] = courierStatus;

        // Use aggregation to return a flattened list of items
        const items = await Order.aggregate([
            { $match: orderQuery },
            { $unwind: "$items" },
            itemMatch["items.sellerStatus"] || itemMatch["items.courierStatus"]
                ? { $match: itemMatch }
                : { $match: {} },
            // Populate buyerId
            {
                $lookup: {
                    from: "users",
                    localField: "buyerId",
                    foreignField: "_id",
                    as: "buyerId"
                }
            },
            { $unwind: "$buyerId" },
            // Populate items.productId
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "items.productId"
                }
            },
            { $unwind: "$items.productId" },
            // Populate items.courierDetails.courierId
            {
                $lookup: {
                    from: "users",
                    localField: "items.courierDetails.courierId",
                    foreignField: "_id",
                    as: "items.courierDetails.courierId"
                }
            },
            {
                $unwind: {
                    path: "$items.courierDetails.courierId",
                    preserveNullAndEmptyArrays: true
                }
            },
            // Project the final item structure
            {
                $project: {
                    orderId: "$_id",
                    buyer: {
                        _id: "$buyerId._id",
                        name: "$buyerId.name",
                        email: "$buyerId.email",
                        phone: "$buyerId.phone"
                    },
                    item: {
                        product: {
                            _id: "$items.productId._id",
                            title: "$items.productId.title",
                            price: "$items.productId.price",
                            brand: "$items.productId.brand",
                            condition: "$items.productId.condition",
                            images: "$items.productId.images",
                            seller: "$items.productId.sellerId"
                        },
                        quantity: "$items.quantity",
                        price: "$items.price",
                        sellerStatus: "$items.sellerStatus",
                        courierDetails: {
                            courierId: "$items.courierDetails.courierId",
                            trackingNumber: "$items.courierDetails.trackingNumber"
                        },
                        courierStatus: "$items.courierStatus",
                        statusHistory: "$items.statusHistory"
                    },
                    orderStatus: "$status",
                    shippingAddress: "$shippingAddress",
                    orderCreatedAt: "$createdAt",
                    orderUpdatedAt: "$updatedAt"
                }
            },
            { $sort: { orderCreatedAt: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: items
        });
    } catch (err) {
        console.error(`Error in getAllOrders:`, err);
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