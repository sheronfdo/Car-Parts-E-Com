const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

// Get all orders containing seller's products
// exports.getSellerOrders = async (req, res) => {
//     const sellerId = req.user.id;
//     try {
//         // Step 1: Find all orders and populate product details
//         const orders = await Order.find()
//             .populate({
//                 path: "items.productId",
//                 select: "title price condition brand images sellerId" // Include sellerId from Product
//             })
//             .populate("buyerId", "name email phone");
//
//         // Step 2: Filter orders to include only those with seller's products
//         const filteredOrders = orders
//             .map(order => {
//                 // Filter items where productId.sellerId matches the seller
//                 const sellerItems = order.items.filter(item =>
//                     item.productId && // Ensure productId is populated
//                     item.productId.sellerId && // Ensure sellerId exists
//                     item.productId.sellerId.toString() === sellerId // Match sellerId
//                 );
//
//                 // If no items belong to this seller, skip the order
//                 if (sellerItems.length === 0) return null;
//
//                 // Return the order with only the seller's items
//                 return {
//                     ...order.toObject(),
//                     items: sellerItems
//                 };
//             })
//             .filter(order => order !== null); // Remove null entries
//
//         res.status(200).json({ success: true, data: filteredOrders });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

// exports.getSellerOrders = async (req, res) => {
//     const sellerId = req.user.id;
//     const page = parseInt(req.query.page) || 1; // Default to page 1
//     const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
//     const skip = (page - 1) * limit; // Calculate documents to skip
//
//     try {
//         // Step 1: Find all orders and populate product details
//         const orders = await Order.find()
//             .populate({
//                 path: "items.productId",
//                 select: "title price condition brand images sellerId" // Include sellerId from Product
//             })
//             .populate("buyerId", "name email phone");
//
//         // Step 2: Filter orders to include only those with seller's products
//         const filteredOrders = orders
//             .map(order => {
//                 // Filter items where productId.sellerId matches the seller
//                 const sellerItems = order.items.filter(item =>
//                     item.productId && // Ensure productId is populated
//                     item.productId.sellerId && // Ensure sellerId exists
//                     item.productId.sellerId.toString() === sellerId // Match sellerId
//                 );
//
//                 // If no items belong to this seller, skip the order
//                 if (sellerItems.length === 0) return null;
//
//                 // Return the order with only the seller's items
//                 return {
//                     ...order.toObject(),
//                     items: sellerItems
//                 };
//             })
//             .filter(order => order !== null); // Remove null entries
//
//         // Step 3: Paginate the filtered orders
//         const total = filteredOrders.length; // Total number of filtered orders
//         const paginatedOrders = filteredOrders.slice(skip, skip + limit); // Apply pagination
//
//         // Step 4: Construct the response with pagination details
//         res.status(200).json({
//             success: true,
//             data: paginatedOrders,
//             pagination: {
//                 page: page,
//                 limit: limit,
//                 total: total
//             }
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

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
                    items: [item], // Wrap the single item in an array to match the expected format
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

// Get specific order details for seller's products
// exports.getSellerOrderById = async (req, res) => {
//     const sellerId = req.user.id;
//     const { id } = req.params;

//     try {
//         const order = await Order.findById(id)
//             .populate({
//                 path: "items.productId",
//                 select: "title price condition brand images sellerId" // Include sellerId
//             })
//             .populate("buyerId", "name email phone");

//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         const sellerItems = order.items.filter(item =>
//             item.productId &&
//             item.productId.sellerId &&
//             item.productId.sellerId.toString() === sellerId
//         );

//         if (sellerItems.length === 0) {
//             return res.status(404).json({ success: false, message: "No items in this order belong to you" });
//         }

//         const filteredOrder = {
//             ...order.toObject(),
//             items: sellerItems
//         };

//         res.status(200).json({ success: true, data: filteredOrder });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

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
            items: [item], // Wrap the single item in an array to match the expected format
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


// Update seller-specific status for items in an order
// exports.updateOrderStatus = async (req, res) => {
//     const sellerId = req.user.id;
//     const { id } = req.params;
//     const { status } = req.body;

//     if (!["Accepted","Processing", "Shipped"].includes(status)) {
//         return res.status(400).json({ success: false, message: "Invalid status" });
//     }

//     try {
//         const order = await Order.findById(id);
//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         // Get seller's product IDs
//         const products = await Product.find({ sellerId });
//         const sellerProductIds = products.map(p => p._id.toString());

//         // Update only items belonging to the seller
//         let updated = false;
//         const updatedItems = order.items.map(item => {
//             if (item.productId && sellerProductIds.includes(item.productId.toString())) {
//                 item.sellerStatus = status;
//                 order.statusHistory.push({
//                     status: `Seller updated item to ${status}`,
//                     updatedBy: { role: "seller", userId: sellerId }
//                 });
//                 updated = true;
//             }
//             return item;
//         });

//         if (!updated) {
//             return res.status(404).json({ success: false, message: "No items in this order belong to you" });
//         }

//         order.items = updatedItems;
//         // order.statusHistory.push({ status: `Seller updated to ${status}`, updatedAt: new Date() });
//         await order.save();

//         res.status(200).json({ success: true, message: `Order status updated to ${status}` });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

exports.updateOrderStatus = async (req, res) => {
    const sellerId = req.user.id;
    const { id } = req.params; // orderId
    const { status, productId } = req.body;

    // Validate status
    if (!["Accepted", "Processing"].includes(status)) {
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


// exports.handoverToCourier = async (req, res) => {
//     const sellerId = req.user.id;
//     const { id } = req.params;
//     const { trackingNumber } = req.body;

//     try {
//         const order = await Order.findById(id);
//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         const products = await Product.find({ sellerId });
//         const sellerProductIds = products.map(p => p._id.toString());
//         const sellerItems = order.items.filter(item =>
//             item.productId && sellerProductIds.includes(item.productId.toString())
//         );

//         if (sellerItems.length === 0) {
//             return res.status(404).json({ success: false, message: "No items in this order belong to you" });
//         }

//         order.items = order.items.map(item => {
//             if (sellerProductIds.includes(item.productId.toString())) {
//                 item.sellerStatus = "Shipped";
//                 order.statusHistory.push({
//                     status: `Seller updated item to Shipped`,
//                     updatedBy: { role: "seller", userId: sellerId }
//                 });
//             }
//             return item;
//         });

//         order.courierDetails = {
//             courierId: null,
//             trackingNumber: trackingNumber || `TRK-${Date.now()}`
//         };
//         order.courierStatus = "Pending";
//         // order.statusHistory.push({ status: "Handed over to courier service", updatedAt: new Date() });
//         order.statusHistory.push({
//             status: "Handed over to courier service",
//             updatedBy: { role: "seller", userId: sellerId }
//         });
//         const allShipped = order.items.every(item => item.sellerStatus === "Shipped");
//         if (allShipped) {
//             order.status = "Shipped";
//             order.statusHistory.push({
//                 status: "Order status updated to Shipped",
//                 updatedBy: { role: "system" }
//             });
//         }

//         await order.save();
//         res.status(200).json({ success: true, message: "Order handed over to courier service" });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };


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
            order.statusHistory.push({
                status: "Order status updated to Shipped",
                updatedBy: { role: "system" },
                updatedAt: new Date()
            });
        }

        // Step 6: Save the updated order
        await order.save();
        res.status(200).json({ success: true, message: "Item handed over to courier service" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.getSellerAnalytics = async (req, res) => {
//     const sellerId = req.user.id;
//     try {
//         // Total orders and revenue for seller's products
//         const orders = await Order.find().populate("items.productId");
//         const sellerOrders = orders.filter(order =>
//             order.items.some(item => item.productId && item.productId.sellerId.toString() === sellerId)
//         );
//         const totalOrders = sellerOrders.length;
//         const totalRevenue = sellerOrders.reduce((sum, order) =>
//                 sum + order.items.reduce((itemSum, item) =>
//                         item.productId.sellerId.toString() === sellerId && item.sellerStatus === "Delivered"
//                             ? itemSum + (item.quantity * item.price)
//                             : itemSum,
//                     0),
//             0);

//         // Order status breakdown for seller's items
//         const statusBreakdown = sellerOrders.reduce((acc, order) => {
//             order.items.forEach(item => {
//                 if (item.productId.sellerId.toString() === sellerId) {
//                     acc[item.sellerStatus] = (acc[item.sellerStatus] || 0) + 1;
//                 }
//             });
//             return acc;
//         }, {});

//         // Top-selling products
//         const topProducts = await Order.aggregate([
//             { $unwind: "$items" },
//             { $match: { "items.productId": { $in: (await Product.find({ sellerId })).map(p => p._id) }, "items.sellerStatus": "Delivered" } },
//             { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } } } },
//             { $sort: { totalSold: -1 } },
//             { $limit: 5 },
//             { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
//             { $unwind: "$product" },
//             { $project: { title: "$product.title", totalSold: 1, revenue: 1 } }
//         ]);

//         // Stock levels
//         const lowStockProducts = await Product.find({
//             sellerId,
//             stock: { $lt: 10 }, // Threshold for low stock
//             status: "active"
//         }).select("title stock");

//         res.status(200).json({
//             success: true,
//             data: {
//                 totalOrders,
//                 totalRevenue,
//                 statusBreakdown,
//                 topProducts,
//                 lowStockProducts
//             }
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };



exports.getSellerAnalytics = async (req, res) => {
    const sellerId = req.user.id;

    try {
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

        const sellerProductIds = await Product.distinct("_id", { sellerId });

        if (!sellerProductIds.length) {
            return res.status(200).json({
                success: true,
                data: {
                    totalOrders: 0,
                    totalRevenue: 0,
                    statusBreakdown: {},
                    topProducts: [],
                    lowStockProducts: []
                }
            });
        }

        const orderAnalytics = await Order.aggregate([
            { $unwind: "$items" },
            { $match: { "items.productId": { $in: sellerProductIds } } },
            {
                $group: {
                    _id: "$_id",
                    items: { $push: "$items" }
                }
            },
            {
                $facet: {
                    totalOrders: [{ $count: "count" }],
                    totalRevenue: [
                        { $unwind: "$items" },
                        { $match: { "items.sellerStatus": "Delivered" } },
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

        const topProducts = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.productId": { $in: sellerProductIds },
                    "items.sellerStatus": "Delivered"
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

        const lowStockProducts = await Product.find({
            sellerId,
            stock: { $lt: 10 },
            status: "active"
        })
            .select("title stock")
            .sort({ stock: 1 });

        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                totalRevenue,
                statusBreakdown: statusBreakdownObj,
                topProducts,
                lowStockProducts
            }
        });
    } catch (err) {
        console.error(`Error in getSellerAnalytics for sellerId ${sellerId}:`, err);
        res.status(500).json({ success: false, message: err.message });
    }
};