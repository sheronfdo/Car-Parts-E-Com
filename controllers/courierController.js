const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");


// exports.getCourierOrders = async (req, res) => {
//     const courierId = req.user.id;
//     try {
//         const courier = await User.findById(courierId);
//         if (!courier || courier.role !== "courier" || !courier.region) {
//             return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
//         }

//         const orders = await Order.find({
//             $or: [
//                 { "courierDetails.courierId": courierId },
//                 {
//                     "shippingAddress.district": courier.region,
//                     "courierDetails.courierId": null,
//                     status: "Shipped"
//                 }
//             ]
//         })
//             .populate("items.productId", "title price condition brand images sellerId")
//             .populate("buyerId", "name email phone");

//         res.status(200).json({ success: true, data: orders });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };


exports.getCourierOrders = async (req, res) => {
    const courierId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit; // Calculate documents to skip

    try {
        // Step 1: Validate the courier and region
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        // Step 2: Find orders that match the courier's criteria
        const orders = await Order.find({
            $or: [
                { "items.courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "items.courierDetails.courierId": null,
                    "items.sellerStatus": "Shipped"
                }
            ]
        })
            .populate("items.productId", "title price condition brand images sellerId")
            .populate("buyerId", "name email phone");

        // Step 3: Transform orders into item-level entries for the courier
        const itemLevelData = orders
            .flatMap(order => {
                // Filter items that the courier can access
                const courierItems = order.items.filter(item =>
                    (item.courierDetails && item.courierDetails.courierId && item.courierDetails.courierId.toString() === courierId) ||
                    (item.courierDetails && !item.courierDetails.courierId && item.sellerStatus === "Shipped" && order.shippingAddress.district === courier.region)
                );

                // Map each courier item to an item-level entry with order details
                return courierItems.map(item => ({
                    shippingAddress: order.shippingAddress,
                    _id: order._id, // Order ID
                    buyerId: order.buyerId, // Populated buyer details
                    items: [item], // Wrap the single item in an array to match the expected format
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    __v: order.__v
                }));
            });

        // Step 4: Paginate the item-level entries
        const total = itemLevelData.length; // Total number of items
        const paginatedItems = itemLevelData.slice(skip, skip + limit); // Apply pagination

        // Step 5: Construct the response with pagination details
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

// exports.getCourierOrderById = async (req, res) => {
//     const courierId = req.user.id;
//     const { id } = req.params;

//     try {
//         const courier = await User.findById(courierId);
//         if (!courier || courier.role !== "courier" || !courier.region) {
//             return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
//         }

//         const order = await Order.findOne({
//             _id: id,
//             $or: [
//                 { "courierDetails.courierId": courierId },
//                 {
//                     "shippingAddress.district": courier.region,
//                     "courierDetails.courierId": null,
//                     status: "Shipped"
//                 }
//             ]
//         })
//             .populate("items.productId", "title price condition brand images sellerId")
//             .populate("buyerId", "name email phone");

//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found or not accessible" });
//         }

//         res.status(200).json({ success: true, data: order });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

exports.getCourierOrderById = async (req, res) => {
    const courierId = req.user.id;
    const { id } = req.params;

    try {
        // Step 1: Validate the courier and region
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        // Step 2: Find the order by ID with the courier's criteria
        const order = await Order.findOne({
            _id: id,
            $or: [
                { "items.courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "items.courierDetails.courierId": null,
                    "items.sellerStatus": "Shipped"
                }
            ]
        })
            .populate("items.productId", "title price condition brand images sellerId")
            .populate("buyerId", "name email phone");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or not accessible" });
        }

        // Step 3: Filter items that the courier can access
        const courierItems = order.items.filter(item =>
            (item.courierDetails && item.courierDetails.courierId && item.courierDetails.courierId.toString() === courierId) ||
            (item.courierDetails && !item.courierDetails.courierId && item.sellerStatus === "Shipped" && order.shippingAddress.district === courier.region)
        );

        if (courierItems.length === 0) {
            return res.status(404).json({ success: false, message: "No items in this order are accessible to you" });
        }

        // Step 4: Transform the order into item-level entries
        const itemLevelData = courierItems.map(item => ({
            shippingAddress: order.shippingAddress,
            _id: order._id, // Order ID
            buyerId: order.buyerId, // Populated buyer details
            items: [item], // Wrap the single item in an array to match the expected format
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            __v: order.__v
        }));

        // Step 5: Construct the response
        res.status(200).json({
            success: true,
            data: itemLevelData
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.updateCourierStatus = async (req, res) => {
//     const courierId = req.user.id;
//     const { id } = req.params;
//     const { status, reason } = req.body;

//     const validStatuses = ["Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed Delivery"];
//     if (!validStatuses.includes(status)) {
//         return res.status(400).json({ success: false, message: "Invalid status" });
//     }
//     if (status === "Failed Delivery" && !reason) {
//         return res.status(400).json({ success: false, message: "Reason required for Failed Delivery" });
//     }

//     try {
//         const courier = await User.findById(courierId);
//         if (!courier || courier.role !== "courier" || !courier.region) {
//             return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
//         }

//         const order = await Order.findOne({
//             _id: id,
//             $or: [
//                 { "courierDetails.courierId": courierId },
//                 {
//                     "shippingAddress.district": courier.region,
//                     "courierDetails.courierId": null,
//                     status: "Shipped"
//                 }
//             ]
//         });

//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found or not accessible" });
//         }

//         if (!order.courierDetails.courierId && status === "Picked Up") {
//             order.courierDetails.courierId = courierId;
//             order.courierDetails.trackingNumber = order.courierDetails.trackingNumber || `TRK-${Date.now()}`;
//             order.statusHistory.push({
//                 status: "Courier assigned",
//                 updatedBy: { role: "courier", userId: courierId }
//             });
//         }

//         if (order.courierDetails.courierId && order.courierDetails.courierId.toString() !== courierId) {
//             return res.status(403).json({ success: false, message: "Order assigned to another courier" });
//         }

//         order.courierStatus = status;
//         order.statusHistory.push({
//             status: `Courier updated to ${status}${reason ? `: ${reason}` : ""}`,
//             updatedBy: { role: "courier", userId: courierId }
//         });

//         if (status === "Delivered") {
//             order.status = "Delivered";
//             order.statusHistory.push({
//                 status: "Order status updated to Delivered",
//                 updatedBy: { role: "system" }
//             });
//         } else if (status === "Failed Delivery") {
//             order.status = "Shipped";
//             order.statusHistory.push({
//                 status: "Order status reverted to Shipped due to failure",
//                 updatedBy: { role: "system" }
//             });
//         } else if (status === "Picked Up") {
//             order.status = "Shipped";
//             order.statusHistory.push({
//                 status: "Order status confirmed as Shipped",
//                 updatedBy: { role: "system" }
//             });
//         }

//         await order.save();
//         res.status(200).json({ success: true, message: `Courier status updated to ${status}` });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };


// exports.updateCourierStatus = async (req, res) => {
//     const courierId = req.user.id;
//     const { id } = req.params; // orderId
//     const { status, reason, productId } = req.body;

//     // Validate status
//     const validStatuses = ["Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed Delivery"];
//     if (!validStatuses.includes(status)) {
//         return res.status(400).json({ success: false, message: "Invalid status" });
//     }
//     if (status === "Failed Delivery" && !reason) {
//         return res.status(400).json({ success: false, message: "Reason required for Failed Delivery" });
//     }
//     if (!productId) {
//         return res.status(400).json({ success: false, message: "productId is required in the request body" });
//     }

//     try {
//         // Step 1: Validate the courier and region
//         const courier = await User.findById(courierId);
//         if (!courier || courier.role !== "courier" || !courier.region) {
//             return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
//         }

//         // Step 2: Find the order with the courier's criteria
//         const order = await Order.findOne({
//             _id: id,
//             $or: [
//                 { "items.courierDetails.courierId": courierId },
//                 {
//                     "shippingAddress.district": courier.region,
//                     "items.courierDetails.courierId": null,
//                     "items.sellerStatus": "Shipped"
//                 }
//             ]
//         });

//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found or not accessible" });
//         }

//         // Step 3: Find the specific item in the order
//         const item = order.items.find(item => item.productId && item.productId.toString() === productId);
//         if (!item) {
//             return res.status(404).json({ success: false, message: "Item not found in order" });
//         }

//         // Step 4: Verify the item is accessible to the courier
//         const isAssignedToCourier = item.courierDetails && item.courierDetails.courierId && item.courierDetails.courierId.toString() === courierId;
//         const isUnassignedAndMatchesRegion = item.courierDetails && !item.courierDetails.courierId && item.sellerStatus === "Shipped" && order.shippingAddress.district === courier.region;
//         if (!isAssignedToCourier && !isUnassignedAndMatchesRegion) {
//             return res.status(403).json({ success: false, message: "Item not accessible to you" });
//         }

//         // Step 5: Check if the item is already assigned to another courier
//         if (item.courierDetails.courierId && item.courierDetails.courierId.toString() !== courierId) {
//             return res.status(403).json({ success: false, message: "Item assigned to another courier" });
//         }

//         // Step 6: Assign the courier to the item if status is "Picked Up" and not yet assigned
//         if (!item.courierDetails.courierId && status === "Picked Up") {
//             item.courierDetails.courierId = courierId;
//             item.courierDetails.trackingNumber = item.courierDetails.trackingNumber || `TRK-${Date.now()}`;
//             item.statusHistory.push({
//                 status: "Courier assigned",
//                 updatedBy: { role: "courier", userId: courierId },
//                 updatedAt: new Date()
//             });
//         }

//         // Step 7: Update the item's courierStatus and statusHistory
//         item.courierStatus = status;
//         item.statusHistory.push({
//             status: `Courier updated to ${status}${reason ? `: ${reason}` : ""}`,
//             updatedBy: { role: "courier", userId: courierId },
//             updatedAt: new Date()
//         });

//         // Step 8: Update the order's top-level status based on all items' courierStatus
//         const allDelivered = order.items.every(item => item.courierStatus === "Delivered");
//         const anyFailed = order.items.some(item => item.courierStatus === "Failed Delivery");

//         if (allDelivered) {
//             order.status = "Delivered";
//             order.statusHistory.push({
//                 status: "Order status updated to Delivered",
//                 updatedBy: { role: "system" },
//                 updatedAt: new Date()
//             });
//         } else if (anyFailed) {
//             order.status = "Shipped";
//             order.statusHistory.push({
//                 status: "Order status reverted to Shipped due to failure",
//                 updatedBy: { role: "system" },
//                 updatedAt: new Date()
//             });
//         } else if (status === "Picked Up") {
//             order.status = "Shipped";
//             order.statusHistory.push({
//                 status: "Order status confirmed as Shipped",
//                 updatedBy: { role: "system" },
//                 updatedAt: new Date()
//             });
//         }

//         // Step 9: Save the updated order
//         await order.save();
//         res.status(200).json({ success: true, message: `Courier status updated to ${status}` });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };
exports.updateCourierStatus = async (req, res) => {
    const courierId = req.user.id;
    const { id } = req.params; // orderId
    const { status, reason, productId } = req.body;

    // Step 1: Validate inputs
    const validStatuses = ["Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed Delivery"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (status === "Failed Delivery" && !reason) {
        return res.status(400).json({ success: false, message: "Reason required for Failed Delivery" });
    }
    if (!productId) {
        return res.status(400).json({ success: false, message: "productId is required in the request body" });
    }

    try {
        // Step 2: Validate the courier and region
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        // Step 3: Find the order
        const order = await Order.findOne({
            _id: id,
            $or: [
                { "items.courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "items.courierDetails.courierId": null,
                    "items.sellerStatus": "Shipped"
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or not accessible" });
        }

        // Step 4: Find the specific item in the order
        const item = order.items.find(item => item.productId && item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found in order" });
        }

        // Step 5: Check if the item is already assigned to another courier (via courierDetails or statusHistory)
        let implicitCourierId = null;
        if (!item.courierDetails.courierId) {
            // Check statusHistory for previous courier updates
            const courierUpdates = item.statusHistory.filter(history =>
                history.updatedBy.role === "courier" && history.updatedBy.userId
            );
            if (courierUpdates.length > 0) {
                implicitCourierId = courierUpdates[courierUpdates.length - 1].updatedBy.userId.toString();
            }
        }

        const assignedCourierId = item.courierDetails.courierId ? item.courierDetails.courierId.toString() : implicitCourierId;
        if (assignedCourierId && assignedCourierId !== courierId) {
            return res.status(403).json({ success: false, message: "Item assigned to another courier" });
        }

        // Step 6: Verify the item is accessible to the courier
        const isAssignedToCourier = assignedCourierId === courierId;
        const isUnassignedAndMatchesRegion = !assignedCourierId && item.sellerStatus === "Shipped" && order.shippingAddress.district === courier.region;
        if (!isAssignedToCourier && !isUnassignedAndMatchesRegion) {
            return res.status(403).json({ success: false, message: "Item not accessible to you" });
        }

        // Step 7: Validate status transition
        const statusFlow = {
            "Pending": ["Picked Up"],
            "Picked Up": ["In Transit"],
            "In Transit": ["Out for Delivery"],
            "Out for Delivery": ["Delivered", "Failed Delivery"],
            "Delivered": [],
            "Failed Delivery": ["Out for Delivery","Delivered"]
        };

        const currentStatus = item.courierStatus || "Pending";
        const allowedNextStatuses = statusFlow[currentStatus] || [];
        if (!allowedNextStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: Cannot move from ${currentStatus} to ${status}. Allowed next statuses: ${allowedNextStatuses.join(", ")}`
            });
        }

        // Step 8: Prevent redundant updates
        if (item.courierStatus === status) {
            return res.status(400).json({ success: false, message: `Item is already in ${status} status` });
        }

        // Step 9: Assign the courier to the item if status is "Picked Up" and not yet assigned
        if (!item.courierDetails.courierId && status === "Picked Up") {
            item.courierDetails.courierId = courierId;
            item.courierDetails.trackingNumber = item.courierDetails.trackingNumber || `TRK-${Date.now()}`;
            item.statusHistory.push({
                status: "Courier assigned",
                updatedBy: { role: "courier", userId: courierId },
                updatedAt: new Date()
            });

            // Update order status to "Shipped" when the item is picked up
            if (order.status !== "Shipped") {
                order.status = "Shipped";
            }
        }

        // Step 10: Update the item's courierStatus and statusHistory
        item.courierStatus = status;
        item.statusHistory.push({
            status: `Courier updated to ${status}${reason ? `: ${reason}` : ""}`,
            updatedBy: { role: "courier", userId: courierId },
            updatedAt: new Date()
        });

        // Step 11: Save the updated order
        await order.save();
        res.status(200).json({ success: true, message: `Courier status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.reportDeliveryIssue = async (req, res) => {
//     const courierId = req.user.id;
//     const { id } = req.params;
//     const { reason } = req.body;
//
//     if (!reason) {
//         return res.status(400).json({ success: false, message: "Reason is required" });
//     }
//
//     try {
//         const order = await Order.findOne({
//             _id: id,
//             "courierDetails.courierId": courierId
//         });
//
//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found or not assigned to you" });
//         }
//
//         order.courierStatus = "Failed Delivery";
//         // order.statusHistory.push({
//         //     status: `Delivery failed: ${reason}`,
//         //     updatedBy: { role: "courier", userId: courierId }
//         // });
//         order.status = "Shipped";
//         // order.statusHistory.push({
//         //     status: "Order status reverted to Shipped due to failure",
//         //     updatedBy: { role: "system",userId: null }
//         // });
//
//         await order.save();
//         res.status(200).json({ success: true, message: "Delivery issue reported" });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

// exports.reportDeliveryIssue = async (req, res) => {
//     const courierId = req.user.id;
//     const { id } = req.params;
//     const { reason } = req.body;

//     if (!reason) {
//         return res.status(400).json({ success: false, message: "Reason is required" });
//     }

//     try {
//         const order = await Order.findOne({
//             _id: id,
//             "courierDetails.courierId": courierId
//         });

//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found or not assigned to you" });
//         }

//         order.courierStatus = "Failed Delivery";

//         // Push courier-reported failure with full updatedBy object
//         order.statusHistory.push({
//             status: `Delivery failed: ${reason}`,
//             updatedBy: {
//                 role: "courier",
//                 userId: courierId
//             }
//         });

//         // Push system status update with a null userId for "system" role
//         order.statusHistory.push({
//             status: "Order status reverted to Shipped due to failure",
//             updatedBy: {
//                 role: "system",
//                 userId: null // No specific user for system; null is allowed since userId isn’t required
//             }
//         });

//         order.status = "Shipped";

//         await order.save();
//         res.status(200).json({ success: true, message: "Delivery issue reported" });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

exports.reportDeliveryIssue = async (req, res) => {
    const courierId = req.user.id;
    const { id } = req.params; // orderId
    const { reason, productId } = req.body;

    // Step 1: Validate inputs
    if (!reason) {
        return res.status(400).json({ success: false, message: "Reason is required" });
    }
    if (!productId) {
        return res.status(400).json({ success: false, message: "productId is required in the request body" });
    }

    try {
        // Step 2: Find the order with the courier's criteria
        const order = await Order.findOne({
            _id: id,
            "items.courierDetails.courierId": courierId
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or not assigned to you" });
        }

        // Step 3: Find the specific item in the order
        const item = order.items.find(item => item.productId && item.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found in order" });
        }

        // Step 4: Check if the item is assigned to the courier (via courierDetails or statusHistory)
        let implicitCourierId = null;
        if (!item.courierDetails.courierId) {
            // Check statusHistory for previous courier updates
            const courierUpdates = item.statusHistory.filter(history =>
                history.updatedBy.role === "courier" && history.updatedBy.userId
            );
            if (courierUpdates.length > 0) {
                implicitCourierId = courierUpdates[courierUpdates.length - 1].updatedBy.userId.toString();
            }
        }

        const assignedCourierId = item.courierDetails.courierId ? item.courierDetails.courierId.toString() : implicitCourierId;
        if (!assignedCourierId || assignedCourierId !== courierId) {
            return res.status(403).json({ success: false, message: "Item not assigned to you" });
        }

        // Step 5: Validate status transition
        const statusFlow = {
            "Pending": ["Picked Up"],
            "Picked Up": ["In Transit"],
            "In Transit": ["Out for Delivery"],
            "Out for Delivery": ["Delivered", "Failed Delivery"],
            "Delivered": [],
            "Failed Delivery": []
        };

        const currentStatus = item.courierStatus || "Pending";
        const targetStatus = "Failed Delivery";
        const allowedNextStatuses = statusFlow[currentStatus] || [];
        if (!allowedNextStatuses.includes(targetStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status transition: Cannot move from ${currentStatus} to ${targetStatus}. Allowed next statuses: ${allowedNextStatuses.join(", ")}`
            });
        }

        // Step 6: Prevent redundant updates
        if (item.courierStatus === targetStatus) {
            return res.status(400).json({ success: false, message: `Item is already in ${targetStatus} status` });
        }

        // Step 7: Update the item's courierStatus and statusHistory
        item.courierStatus = targetStatus;
        item.statusHistory.push({
            status: `Delivery failed: ${reason}`,
            updatedBy: {
                role: "courier",
                userId: courierId
            },
            updatedAt: new Date()
        });

        // Step 8: Save the updated order
        await order.save();
        res.status(200).json({ success: true, message: "Delivery issue reported" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// exports.getCourierDashboard = async (req, res) => {
//     const courierId = req.user.id;
//     try {
//         const courier = await User.findById(courierId);
//         if (!courier || courier.role !== "courier" || !courier.region) {
//             return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
//         }

//         const orders = await Order.find({
//             $or: [
//                 { "courierDetails.courierId": courierId },
//                 {
//                     "shippingAddress.district": courier.region,
//                     "courierDetails.courierId": null,
//                     status: "Shipped"
//                 }
//             ]
//         });

//         const summary = {
//             totalOrders: orders.length,
//             pending: orders.filter(o => o.courierStatus === "Pending").length,
//             pickedUp: orders.filter(o => o.courierStatus === "Picked Up").length,
//             inTransit: orders.filter(o => o.courierStatus === "In Transit").length,
//             outForDelivery: orders.filter(o => o.courierStatus === "Out for Delivery").length,
//             delivered: orders.filter(o => o.courierStatus === "Delivered").length,
//             failed: orders.filter(o => o.courierStatus === "Failed Delivery").length
//         };

//         res.status(200).json({ success: true, data: summary });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };


exports.getCourierDashboard = async (req, res) => {
    const courierId = req.user.id;

    try {
        // Step 1: Validate the courier
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        // Step 2: Fetch orders and filter items (initial fetch for implicit assignment)
        const orders = await Order.find({
            $or: [
                { "items.courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "items.courierDetails.courierId": null,
                    "items.sellerStatus": "Shipped" // Match previous endpoints' condition
                }
            ]
        }).lean(); // Use lean for performance

        // Step 3: Filter items accessible to the courier (including implicit assignment)
        const accessibleItems = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                // Explicit assignment via courierDetails.courierId
                const isAssignedToCourier = item.courierDetails && item.courierDetails.courierId && item.courierDetails.courierId.toString() === courierId;

                // Implicit assignment via statusHistory
                let implicitCourierId = null;
                if (!isAssignedToCourier && item.statusHistory) {
                    const courierUpdates = item.statusHistory.filter(history =>
                        history.updatedBy.role === "courier" && history.updatedBy.userId
                    );
                    if (courierUpdates.length > 0) {
                        implicitCourierId = courierUpdates[courierUpdates.length - 1].updatedBy.userId.toString();
                    }
                }

                const assignedCourierId = isAssignedToCourier ? item.courierDetails.courierId.toString() : implicitCourierId;
                const isAssigned = assignedCourierId === courierId;

                // Unassigned but matches region and sellerStatus
                const isUnassignedAndMatchesRegion = !assignedCourierId && item.sellerStatus === "Shipped" && order.shippingAddress.district === courier.region;

                if (isAssigned || isUnassignedAndMatchesRegion) {
                    accessibleItems.push({
                        courierStatus: item.courierStatus || "Pending" // Ensure default value
                    });
                }
            });
        });

        // Step 4: Compute item-level summary
        const summary = {
            totalOrders: accessibleItems.length, // Now counts items, not orders
            pending: accessibleItems.filter(item => item.courierStatus === "Pending").length,
            pickedUp: accessibleItems.filter(item => item.courierStatus === "Picked Up").length,
            inTransit: accessibleItems.filter(item => item.courierStatus === "In Transit").length,
            outForDelivery: accessibleItems.filter(item => item.courierStatus === "Out for Delivery").length,
            delivered: accessibleItems.filter(item => item.courierStatus === "Delivered").length,
            failed: accessibleItems.filter(item => item.courierStatus === "Failed Delivery").length
        };

        res.status(200).json({ success: true, data: summary });
    } catch (err) {
        console.error(`Error in getCourierDashboard for courierId ${courierId}:`, err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ... (existing imports and endpoints remain unchanged)

// exports.getCourierAnalytics = async (req, res) => {
//     const courierId = req.user.id;
//     try {
//         const courier = await User.findById(courierId);
//         if (!courier || courier.role !== "courier") {
//             return res.status(400).json({ success: false, message: "Invalid courier" });
//         }

//         // Total orders handled by status
//         const orders = await Order.find({ "courierDetails.courierId": courierId });
//         const statusBreakdown = {
//             totalOrders: orders.length,
//             pending: orders.filter(o => o.courierStatus === "Pending").length,
//             pickedUp: orders.filter(o => o.courierStatus === "Picked Up").length,
//             inTransit: orders.filter(o => o.courierStatus === "In Transit").length,
//             outForDelivery: orders.filter(o => o.courierStatus === "Out for Delivery").length,
//             delivered: orders.filter(o => o.courierStatus === "Delivered").length,
//             failed: orders.filter(o => o.courierStatus === "Failed Delivery").length
//         };

//         // Delivery success rate
//         const delivered = statusBreakdown.delivered;
//         const failed = statusBreakdown.failed;
//         const successRate = delivered + failed > 0 ? (delivered / (delivered + failed)) * 100 : 0;

//         // Average delivery time
//         const deliveryTimes = await Order.aggregate([
//             { $match: { "courierDetails.courierId": courierId, courierStatus: "Delivered" } },
//             { $unwind: "$statusHistory" },
//             { $match: { "statusHistory.status": { $in: ["Courier updated to Picked Up", "Courier updated to Delivered"] } } },
//             { $group: {
//                     _id: "$_id",
//                     pickedUp: { $min: { $cond: [{ $eq: ["$statusHistory.status", "Courier updated to Picked Up"] }, "$statusHistory.updatedAt", null] } },
//                     delivered: { $max: { $cond: [{ $eq: ["$statusHistory.status", "Courier updated to Delivered"] }, "$statusHistory.updatedAt", null] } }
//                 } },
//             { $match: { pickedUp: { $ne: null }, delivered: { $ne: null } } },
//             { $project: { timeDiff: { $subtract: ["$delivered", "$pickedUp"] } } },
//             { $group: { _id: null, avgTime: { $avg: "$timeDiff" } } } // Time in milliseconds
//         ]);

//         res.status(200).json({
//             success: true,
//             data: {
//                 statusBreakdown,
//                 successRate: successRate.toFixed(2),
//                 averageDeliveryTime: deliveryTimes[0]?.avgTime ? (deliveryTimes[0].avgTime / (1000 * 60 * 60)).toFixed(2) + " hours" : "N/A"
//             }
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// };

exports.getCourierAnalytics = async (req, res) => {
    const courierId = req.user.id;

    try {
        // Step 1: Validate the courier
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier") {
            return res.status(400).json({ success: false, message: "Invalid courier" });
        }

        // Step 2: Fetch orders with items assigned to the courier
        const orders = await Order.find({
            "items.courierDetails.courierId": new mongoose.Types.ObjectId(courierId)
        }).lean();

        // Step 3: Filter items assigned to the courier (including implicit assignment)
        const assignedItems = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                // Explicit assignment via courierDetails.courierId
                const isAssignedToCourier = item.courierDetails && item.courierDetails.courierId && item.courierDetails.courierId.toString() === courierId;

                // Implicit assignment via statusHistory
                let implicitCourierId = null;
                if (!isAssignedToCourier && item.statusHistory) {
                    const courierUpdates = item.statusHistory.filter(history =>
                        history.updatedBy.role === "courier" && history.updatedBy.userId
                    );
                    if (courierUpdates.length > 0) {
                        implicitCourierId = courierUpdates[courierUpdates.length - 1].updatedBy.userId.toString();
                    }
                }

                const assignedCourierId = isAssignedToCourier ? item.courierDetails.courierId.toString() : implicitCourierId;
                if (assignedCourierId === courierId) {
                    assignedItems.push({
                        courierStatus: item.courierStatus || "Pending"
                    });
                }
            });
        });

        // Step 4: Compute item-level status breakdown
        const statusBreakdown = {
            totalOrders: assignedItems.length, // Now counts items, not orders
            pending: assignedItems.filter(item => item.courierStatus === "Pending").length,
            pickedUp: assignedItems.filter(item => item.courierStatus === "Picked Up").length,
            inTransit: assignedItems.filter(item => item.courierStatus === "In Transit").length,
            outForDelivery: assignedItems.filter(item => item.courierStatus === "Out for Delivery").length,
            delivered: assignedItems.filter(item => item.courierStatus === "Delivered").length,
            failed: assignedItems.filter(item => item.courierStatus === "Failed Delivery").length
        };

        // Step 5: Compute delivery success rate (item-level)
        const delivered = statusBreakdown.delivered;
        const failed = statusBreakdown.failed;
        const successRate = delivered + failed > 0 ? (delivered / (delivered + failed)) * 100 : 0;

        // Step 6: Compute average delivery time (item-level)
        const deliveryTimes = await Order.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.courierDetails.courierId": new mongoose.Types.ObjectId(courierId),
                    "items.courierStatus": "Delivered"
                }
            },
            { $unwind: "$items.statusHistory" },
            {
                $match: {
                    "items.statusHistory.status": { $in: ["Courier updated to Picked Up", "Courier updated to Delivered"] }
                }
            },
            {
                $group: {
                    _id: { orderId: "$_id", itemId: "$items._id" }, // Group by order and item
                    pickedUp: {
                        $min: {
                            $cond: [
                                { $eq: ["$items.statusHistory.status", "Courier updated to Picked Up"] },
                                "$items.statusHistory.updatedAt",
                                null
                            ]
                        }
                    },
                    delivered: {
                        $max: {
                            $cond: [
                                { $eq: ["$items.statusHistory.status", "Courier updated to Delivered"] },
                                "$items.statusHistory.updatedAt",
                                null
                            ]
                        }
                    }
                }
            },
            { $match: { pickedUp: { $ne: null }, delivered: { $ne: null } } },
            { $project: { timeDiff: { $subtract: ["$delivered", "$pickedUp"] } } },
            { $group: { _id: null, avgTime: { $avg: "$timeDiff" } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                statusBreakdown,
                successRate: successRate.toFixed(2),
                averageDeliveryTime: deliveryTimes[0]?.avgTime ? (deliveryTimes[0].avgTime / (1000 * 60 * 60)).toFixed(2) + " hours" : "N/A"
            }
        });
    } catch (err) {
        console.error(`Error in getCourierAnalytics for courierId ${courierId}:`, err);
        res.status(500).json({ success: false, message: err.message });
    }
};