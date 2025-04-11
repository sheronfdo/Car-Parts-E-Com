const Order = require("../models/Order");
const User = require("../models/User");

exports.getCourierOrders = async (req, res) => {
    const courierId = req.user.id;
    try {
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        const orders = await Order.find({
            $or: [
                { "courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "courierDetails.courierId": null,
                    status: "Shipped"
                }
            ]
        })
            .populate("items.productId", "title price condition brand images sellerId")
            .populate("buyerId", "name email phone");

        res.status(200).json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getCourierOrderById = async (req, res) => {
    const courierId = req.user.id;
    const { id } = req.params;

    try {
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        const order = await Order.findOne({
            _id: id,
            $or: [
                { "courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "courierDetails.courierId": null,
                    status: "Shipped"
                }
            ]
        })
            .populate("items.productId", "title price condition brand images sellerId")
            .populate("buyerId", "name email phone");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or not accessible" });
        }

        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateCourierStatus = async (req, res) => {
    const courierId = req.user.id;
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ["Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed Delivery"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }
    if (status === "Failed Delivery" && !reason) {
        return res.status(400).json({ success: false, message: "Reason required for Failed Delivery" });
    }

    try {
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        const order = await Order.findOne({
            _id: id,
            $or: [
                { "courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "courierDetails.courierId": null,
                    status: "Shipped"
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or not accessible" });
        }

        if (!order.courierDetails.courierId && status === "Picked Up") {
            order.courierDetails.courierId = courierId;
            order.courierDetails.trackingNumber = order.courierDetails.trackingNumber || `TRK-${Date.now()}`;
            order.statusHistory.push({
                status: "Courier assigned",
                updatedBy: { role: "courier", userId: courierId }
            });
        }

        if (order.courierDetails.courierId && order.courierDetails.courierId.toString() !== courierId) {
            return res.status(403).json({ success: false, message: "Order assigned to another courier" });
        }

        order.courierStatus = status;
        order.statusHistory.push({
            status: `Courier updated to ${status}${reason ? `: ${reason}` : ""}`,
            updatedBy: { role: "courier", userId: courierId }
        });

        if (status === "Delivered") {
            order.status = "Delivered";
            order.statusHistory.push({
                status: "Order status updated to Delivered",
                updatedBy: { role: "system" }
            });
        } else if (status === "Failed Delivery") {
            order.status = "Shipped";
            order.statusHistory.push({
                status: "Order status reverted to Shipped due to failure",
                updatedBy: { role: "system" }
            });
        } else if (status === "Picked Up") {
            order.status = "Shipped";
            order.statusHistory.push({
                status: "Order status confirmed as Shipped",
                updatedBy: { role: "system" }
            });
        }

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

exports.reportDeliveryIssue = async (req, res) => {
    const courierId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ success: false, message: "Reason is required" });
    }

    try {
        const order = await Order.findOne({
            _id: id,
            "courierDetails.courierId": courierId
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or not assigned to you" });
        }

        order.courierStatus = "Failed Delivery";

        // Push courier-reported failure with full updatedBy object
        order.statusHistory.push({
            status: `Delivery failed: ${reason}`,
            updatedBy: {
                role: "courier",
                userId: courierId
            }
        });

        // Push system status update with a null userId for "system" role
        order.statusHistory.push({
            status: "Order status reverted to Shipped due to failure",
            updatedBy: {
                role: "system",
                userId: null // No specific user for system; null is allowed since userId isn’t required
            }
        });

        order.status = "Shipped";

        await order.save();
        res.status(200).json({ success: true, message: "Delivery issue reported" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getCourierDashboard = async (req, res) => {
    const courierId = req.user.id;
    try {
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier" || !courier.region) {
            return res.status(400).json({ success: false, message: "Invalid courier or region not assigned" });
        }

        const orders = await Order.find({
            $or: [
                { "courierDetails.courierId": courierId },
                {
                    "shippingAddress.district": courier.region,
                    "courierDetails.courierId": null,
                    status: "Shipped"
                }
            ]
        });

        const summary = {
            totalOrders: orders.length,
            pending: orders.filter(o => o.courierStatus === "Pending").length,
            pickedUp: orders.filter(o => o.courierStatus === "Picked Up").length,
            inTransit: orders.filter(o => o.courierStatus === "In Transit").length,
            outForDelivery: orders.filter(o => o.courierStatus === "Out for Delivery").length,
            delivered: orders.filter(o => o.courierStatus === "Delivered").length,
            failed: orders.filter(o => o.courierStatus === "Failed Delivery").length
        };

        res.status(200).json({ success: true, data: summary });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ... (existing imports and endpoints remain unchanged)

exports.getCourierAnalytics = async (req, res) => {
    const courierId = req.user.id;
    try {
        const courier = await User.findById(courierId);
        if (!courier || courier.role !== "courier") {
            return res.status(400).json({ success: false, message: "Invalid courier" });
        }

        // Total orders handled by status
        const orders = await Order.find({ "courierDetails.courierId": courierId });
        const statusBreakdown = {
            totalOrders: orders.length,
            pending: orders.filter(o => o.courierStatus === "Pending").length,
            pickedUp: orders.filter(o => o.courierStatus === "Picked Up").length,
            inTransit: orders.filter(o => o.courierStatus === "In Transit").length,
            outForDelivery: orders.filter(o => o.courierStatus === "Out for Delivery").length,
            delivered: orders.filter(o => o.courierStatus === "Delivered").length,
            failed: orders.filter(o => o.courierStatus === "Failed Delivery").length
        };

        // Delivery success rate
        const delivered = statusBreakdown.delivered;
        const failed = statusBreakdown.failed;
        const successRate = delivered + failed > 0 ? (delivered / (delivered + failed)) * 100 : 0;

        // Average delivery time
        const deliveryTimes = await Order.aggregate([
            { $match: { "courierDetails.courierId": courierId, courierStatus: "Delivered" } },
            { $unwind: "$statusHistory" },
            { $match: { "statusHistory.status": { $in: ["Courier updated to Picked Up", "Courier updated to Delivered"] } } },
            { $group: {
                    _id: "$_id",
                    pickedUp: { $min: { $cond: [{ $eq: ["$statusHistory.status", "Courier updated to Picked Up"] }, "$statusHistory.updatedAt", null] } },
                    delivered: { $max: { $cond: [{ $eq: ["$statusHistory.status", "Courier updated to Delivered"] }, "$statusHistory.updatedAt", null] } }
                } },
            { $match: { pickedUp: { $ne: null }, delivered: { $ne: null } } },
            { $project: { timeDiff: { $subtract: ["$delivered", "$pickedUp"] } } },
            { $group: { _id: null, avgTime: { $avg: "$timeDiff" } } } // Time in milliseconds
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
        res.status(500).json({ success: false, message: err.message });
    }
};