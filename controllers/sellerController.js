const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

exports.getSellerOrders = async (req, res) => {
    const sellerId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit; // Calculate documents to skip

    try {
        // Step 1: Find all orders and populate product and buyer details
        const orders = await Order.find({ status: { $ne: "Pending" } })
            .populate({
                path: "items.productId",
                select: "title price condition brand images sellerId status" // Include sellerId from Product
            })
            .populate("buyerId", "name email phone");

        // Step 2: Transform orders into item-level entries for the seller
        const itemLevelData = orders
            .flatMap(order => {
                // Filter items that belong to the seller
                const sellerItems = order.items.filter(item =>
                    item.productId && // Ensure productId is populated
                    item.productId.sellerId && // Ensure sellerId exists
                    item.productId.sellerId.toString() === sellerId // Match sellerId
                );

                // Map each seller item to an item-level entry with order details
                return sellerItems.map(item => ({
                    shippingAddress: order.shippingAddress,
                    _id: order._id, // Order ID
                    buyerId: order.buyerId, // Populated buyer details
                    item: item, // Single item details
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    __v: order.__v
                }));
            });

        // Step 3: Paginate the item-level entries
        const total = itemLevelData.length; // Total number of items
        const paginatedItems = itemLevelData.slice(skip, skip + limit); // Apply pagination

        // Step 4: Construct the response with pagination details
        res.status(200).json({
            success: true,
            data: paginatedItems,
            pagination: {
                page: page,
                limit: limit,
                total: total
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getSellerOrderById = async (req, res) => {
    const sellerId = req.user.id;
    const { id } = req.params;

    try {
        // Step 1: Find the order by ID, ensuring status is not "Pending", and populate product and buyer details
        const order = await Order.findOne({ _id: id, status: { $ne: "Pending" } })
            .populate({
                path: "items.productId",
                select: "title price condition brand images sellerId" // Include sellerId
            })
            .populate("buyerId", "name email phone");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or is in Pending status" });
        }

        // Step 2: Filter items that belong to the seller
        const sellerItems = order.items.filter(item =>
            item.productId &&
            item.productId.sellerId &&
            item.productId.sellerId.toString() === sellerId
        );

        if (sellerItems.length === 0) {
            return res.status(404).json({ success: false, message: "No items in this order belong to you" });
        }

        // Step 3: Transform the order into item-level entries
        const itemLevelData = sellerItems.map(item => ({
            shippingAddress: order.shippingAddress,
            _id: order._id, // Order ID
            buyerId: order.buyerId, // Populated buyer details
            item: item, // Wrap the single item in an array to match the expected format
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            __v: order.__v
        }));

        // Step 4: Construct the response
        res.status(200).json({
            success: true,
            data: itemLevelData
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.updateOrderStatus = async (req, res) => {
    const sellerId = req.user.id;
    const { id } = req.params; // orderId
    const { status, productId } = req.body;

    // Validate status
    if (!["Cancelled", "Accepted", "Processing", "Shipped"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    // Validate productId presence
    if (!productId) {
        return res.status(400).json({ success: false, message: "productId is required in the request body" });
    }

    try {
        // Step 1: Find the order, ensuring status is not "Pending"
        const order = await Order.findOne({ _id: id, status: { $ne: "Pending" } });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or is in Pending status" });
        }

        // Step 2: Find the specific item in the order
        const item = order.items.find(item => item.productId && item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found in order" });
        }

        // Step 3: Verify the item belongs to the seller
        const product = await Product.findById(productId);
        if (!product || product.sellerId.toString() !== sellerId) {
            return res.status(404).json({ success: false, message: "This item does not belong to you" });
        }

        // Step 4: Update the item's sellerStatus and statusHistory
        item.sellerStatus = status;
        item.statusHistory.push({
            status: `Seller updated item to ${status}`,
            updatedBy: { role: "seller", userId: sellerId },
            updatedAt: new Date()
        });

        // Step 5: Save the updated order
        await order.save();

        res.status(200).json({ success: true, message: `Item status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.handoverToCourier = async (req, res) => {
    const sellerId = req.user.id;
    const { id } = req.params; // orderId
    const { productId, trackingNumber } = req.body;

    // Validate productId presence
    if (!productId) {
        return res.status(400).json({ success: false, message: "productId is required in the request body" });
    }

    try {
        // Step 1: Find the order, ensuring status is not "Pending"
        const order = await Order.findOne({ _id: id, status: { $ne: "Pending" } });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or is in Pending status" });
        }

        // Step 2: Find the specific item in the order
        const item = order.items.find(item => item.productId && item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found in order" });
        }

        // Step 3: Verify the item belongs to the seller
        const product = await Product.findById(productId);
        if (!product || product.sellerId.toString() !== sellerId) {
            return res.status(404).json({ success: false, message: "This item does not belong to you" });
        }

        // Step 4: Update the item's sellerStatus, courierDetails, courierStatus, and statusHistory
        item.sellerStatus = "Shipped";
        item.courierDetails = {
            courierId: null,
            trackingNumber: trackingNumber || `TRK-${id-productId}`
        };
        item.courierStatus = "Pending";
        item.statusHistory.push({
            status: "Seller updated item to Shipped",
            updatedBy: { role: "seller", userId: sellerId },
            updatedAt: new Date()
        });
        item.statusHistory.push({
            status: "Handed over to courier service",
            updatedBy: { role: "seller", userId: sellerId },
            updatedAt: new Date()
        });

        // Step 5: Check if all items in the order are now "Shipped"
        const allShipped = order.items.every(item => item.sellerStatus === "Shipped");
        if (allShipped) {
            order.status = "Shipped";
        }

        // Step 6: Save the updated order
        await order.save();
        res.status(200).json({ success: true, message: "Item handed over to courier service" });
    } catch (err) {
        console.error(`Error in handoverToCourier for sellerId ${sellerId}:`, err);
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getSellerAnalytics = async (req, res) => {
    const sellerId = req.user.id;

    try {
        // Validate user role if User model is available
        if (User) {
            const user = await User.findById(sellerId);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
            if (user.role !== "seller") {
                return res.status(403).json({ success: false, message: "Access denied: User must be a seller" });
            }
        } else {
            console.warn("User model not available, skipping role validation for sellerId:", sellerId);
        }

        // Get all product IDs associated with the seller
        const sellerProductIds = await Product.distinct("_id", { sellerId });

        // If no products are found, return default analytics data
        if (!sellerProductIds.length) {
            return res.status(200).json({
                success: true,
                data: {
                    totalOrders: 0,
                    totalRevenue: 0,
                    statusBreakdown: {},
                    topProducts: [],
                    lowStockProducts: [],
                    earnings: {
                        daily: [],
                        weekly: [],
                        monthly: [],
                        yearly: []
                    }
                }
            });
        }

        // Aggregate total orders and total revenue for delivered or shipped items
        const orderAnalytics = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { "items.productId": { $in: sellerProductIds } } },
            {
                $group: {
                    _id: "$_id",
                    items: { $push: "$items" },
                    orderCreatedAt: { $first: "$createdAt" }
                }
            },
            {
                $facet: {
                    totalOrders: [{ $count: "count" }],
                    totalRevenue: [
                        { $unwind: "$items" },
                        { $match: { "items.sellerStatus": { $in: ["Delivered", "Shipped"] } } }, // Include "Shipped"
                        {
                            $group: {
                                _id: null,
                                totalRevenue: {
                                    $sum: { $multiply: ["$items.quantity", "$items.price"] }
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        const totalOrders = orderAnalytics[0].totalOrders[0]?.count || 0;
        const totalRevenue = orderAnalytics[0].totalRevenue[0]?.totalRevenue || 0;

        // Aggregate status breakdown
        const statusBreakdown = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { "items.productId": { $in: sellerProductIds } } },
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
        ]);

        const statusBreakdownObj = statusBreakdown.reduce((acc, { status, count }) => {
            acc[status] = count;
            return acc;
        }, {});

        // Aggregate top products
        const topProducts = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.productId": { $in: sellerProductIds },
                    "items.sellerStatus": { $in: ["Delivered", "Shipped"] } // Include "Shipped"
                }
            },
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
                    totalSold: 1,
                    revenue: 1
                }
            }
        ]);

        // Aggregate low stock products
        const lowStockProducts = await Product.find({
            sellerId,
            stock: { $lt: 10 },
            status: "active"
        })
            .select("title stock")
            .sort({ stock: 1 });

        // Daily Earnings (last 7 days)
        const dailyEarnings = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.productId": { $in: sellerProductIds },
                    "items.sellerStatus": { $in: ["Delivered", "Shipped"] }, // Include "Shipped"
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    revenue: 1
                }
            }
        ]);

        // Weekly Earnings (last 4 weeks)
        const weeklyEarnings = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.productId": { $in: sellerProductIds },
                    "items.sellerStatus": { $in: ["Delivered", "Shipped"] }, // Include "Shipped"
                    createdAt: { $gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%U", date: "$createdAt" }
                    },
                    revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    week: "$_id",
                    revenue: 1
                }
            }
        ]);

        // Monthly Earnings (last 12 months)
        const monthlyEarnings = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.productId": { $in: sellerProductIds },
                    "items.sellerStatus": { $in: ["Delivered", "Shipped"] }, // Include "Shipped"
                    createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" }
                    },
                    revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    month: "$_id",
                    revenue: 1
                }
            }
        ]);

        // Yearly Earnings (last 5 years)
        const yearlyEarnings = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.productId": { $in: sellerProductIds },
                    "items.sellerStatus": { $in: ["Delivered", "Shipped"] }, // Include "Shipped"
                    createdAt: { $gte: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y", date: "$createdAt" }
                    },
                    revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    year: "$_id",
                    revenue: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                totalRevenue,
                statusBreakdown: statusBreakdownObj,
                topProducts,
                lowStockProducts,
                earnings: {
                    daily: dailyEarnings,
                    weekly: weeklyEarnings,
                    monthly: monthlyEarnings,
                    yearly: yearlyEarnings
                }
            }
        });
    } catch (err) {
        console.error(`Error in getSellerAnalytics for sellerId ${sellerId}:`, err);
        res.status(500).json({ success: false, message: err.message });
    }
};