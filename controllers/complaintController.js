const Order = require("../models/Order");

// Buyer: Submit a complaint (with optional refund request)
exports.submitComplaint = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { productId, description, refundRequested, refundAmount } = req.body;

        // Find the order
        const order = await Order.findOne({ _id: orderId, buyerId: req.user.id });
        if (!order) {
            return res.status(404).json({ message: "Order not found or you don't have access." });
        }

        // Find the item by productId
        const item = order.items.find(i => i.productId.toString() === productId);
        if (!item) {
            return res.status(404).json({ message: "Item not found in order." });
        }

        // Validate item is delivered
        if (item.sellerStatus !== "Delivered") {
            return res.status(400).json({ message: "Complaints can only be submitted for delivered items." });
        }

        // Debug: Log the complaint field
        console.log("Item complaint before check:", item.complaint);

        // Check if a valid complaint already exists
        if (item.complaint?.status && item.complaint.status !== "Closed") {
            return res.status(400).json({ message: "An open or resolved complaint already exists." });
        }

        // Validate refund amount if requested
        if (refundRequested && (refundAmount <= 0 || refundAmount > item.price * item.quantity)) {
            return res.status(400).json({ message: "Invalid refund amount." });
        }

        // Create complaint
        item.complaint = {
            description,
            status: "Open",
            refundRequested: !!refundRequested,
            refundAmount: refundRequested ? refundAmount : 0,
            createdAt: new Date()
        };

        await order.save();
        res.status(200).json({ message: "Complaint submitted successfully." });
    } catch (error) {
        console.error("Submit complaint error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
};

// Seller: Resolve a complaint
exports.resolveComplaint = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { productId, resolution } = req.body; // resolution: "Resolved", "Closed", "Refund Approved", "Refund Rejected"

        // Validate resolution
        if (!["Resolved", "Closed", "Refund Approved", "Refund Rejected"].includes(resolution)) {
            return res.status(400).json({ message: "Invalid resolution status." });
        }

        // Debug: Log inputs
        console.log("Resolve complaint inputs:", { orderId, productId, userId: req.user.id, resolution });

        // Find the order and populate productId to access sellerId
        const order = await Order.findOne({ _id: orderId })
            .populate("items.productId", "sellerId"); // Populate productId to get sellerId field
        if (!order) {
            console.log("Order not found for ID:", orderId);
            return res.status(404).json({ message: "Order not found." });
        }

        // Find the item by productId
        const item = order.items.find(i => i.productId._id.toString() === productId);
        if (!item) {
            console.log("Item not found for productId:", productId);
            return res.status(404).json({ message: "Item not found in order." });
        }

        // Debug: Log productId and sellerId
        console.log("Item productId:", item.productId._id.toString(), "SellerId:", item.productId.sellerId?.toString());

        // Validate seller ownership
        if (!item.productId.sellerId || item.productId.sellerId.toString() !== req.user.id) {
            console.log("Seller mismatch. Expected:", req.user.id, "Got:", item.productId.sellerId?.toString());
            return res.status(403).json({ message: "You don't have access to this item." });
        }

        // Validate item is delivered and has a complaint
        if (item.sellerStatus !== "Delivered") {
            return res.status(400).json({ message: "Complaints can only be resolved for delivered items." });
        }
        if (!item.complaint || item.complaint.status !== "Open") {
            return res.status(400).json({ message: "No open complaint found." });
        }

        // Validate refund resolution
        if ((resolution === "Refund Approved" || resolution === "Refund Rejected") && !item.complaint.refundRequested) {
            return res.status(400).json({ message: "Cannot approve/reject refund; no refund was requested." });
        }

        // Update complaint
        item.complaint.status = resolution;
        item.complaint.resolvedAt = new Date();
        item.complaint.resolvedBy = req.user.id;

        await order.save();
        res.status(200).json({ message: `Complaint ${resolution.toLowerCase()} successfully.` });
    } catch (error) {
        console.error("Resolve complaint error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
};


// Admin: Get all complaints
exports.getAllComplaints = async (req, res) => {
    try {
        const orders = await Order.find({ "items.complaint": { $exists: true } })
            .populate("buyerId", "name email")
            .populate("items.productId", "title seller")
            .populate("items.complaint.resolvedBy", "name"); // Populate seller who resolved

        const complaints = orders.flatMap(order =>
            order.items
                .filter(item => item.complaint)
                .map(item => ({
                    orderId: order._id,
                    productId: item.productId._id,
                    productTitle: item.productId.title,
                    buyer: {
                        id: order.buyerId._id,
                        name: order.buyerId.name,
                        email: order.buyerId.email
                    },
                    seller: {
                        id: item.productId.seller,
                        name: item.complaint.resolvedBy ? item.complaint.resolvedBy.name : "N/A"
                    },
                    complaint: {
                        description: item.complaint.description,
                        status: item.complaint.status,
                        refundRequested: item.complaint.refundRequested,
                        refundAmount: item.complaint.refundAmount,
                        createdAt: item.complaint.createdAt,
                        resolvedAt: item.complaint.resolvedAt
                    }
                }))
        );

        res.status(200).json(complaints);
    } catch (error) {
        console.error("Get complaints error:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
};