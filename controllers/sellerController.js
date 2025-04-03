const Order = require("../models/Order");
const Product = require("../models/Product");

// Get all orders containing seller's products
exports.getSellerOrders = async (req, res) => {
    const sellerId = req.user.id;
    try {
        // Step 1: Find all orders and populate product details
        const orders = await Order.find()
            .populate({
                path: "items.productId",
                select: "title price condition brand images sellerId" // Include sellerId from Product
            })
            .populate("buyerId", "name email phone");

        // Step 2: Filter orders to include only those with seller's products
        const filteredOrders = orders
            .map(order => {
                // Filter items where productId.sellerId matches the seller
                const sellerItems = order.items.filter(item =>
                    item.productId && // Ensure productId is populated
                    item.productId.sellerId && // Ensure sellerId exists
                    item.productId.sellerId.toString() === sellerId // Match sellerId
                );

                // If no items belong to this seller, skip the order
                if (sellerItems.length === 0) return null;

                // Return the order with only the seller's items
                return {
                    ...order.toObject(),
                    items: sellerItems
                };
            })
            .filter(order => order !== null); // Remove null entries

        res.status(200).json({ success: true, data: filteredOrders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get specific order details for seller's products
exports.getSellerOrderById = async (req, res) => {
    const sellerId = req.user.id;
    const { id } = req.params;

    try {
        const order = await Order.findById(id)
            .populate({
                path: "items.productId",
                select: "title price condition brand images sellerId" // Include sellerId
            })
            .populate("buyerId", "name email phone");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const sellerItems = order.items.filter(item =>
            item.productId &&
            item.productId.sellerId &&
            item.productId.sellerId.toString() === sellerId
        );

        if (sellerItems.length === 0) {
            return res.status(404).json({ success: false, message: "No items in this order belong to you" });
        }

        const filteredOrder = {
            ...order.toObject(),
            items: sellerItems
        };

        res.status(200).json({ success: true, data: filteredOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update seller-specific status for items in an order
exports.updateOrderStatus = async (req, res) => {
    const sellerId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["Processing", "Shipped", "Delivered"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Get seller's product IDs
        const products = await Product.find({ sellerId });
        const sellerProductIds = products.map(p => p._id.toString());

        // Update only items belonging to the seller
        let updated = false;
        const updatedItems = order.items.map(item => {
            if (item.productId && sellerProductIds.includes(item.productId.toString())) {
                item.sellerStatus = status;
                updated = true;
            }
            return item;
        });

        if (!updated) {
            return res.status(404).json({ success: false, message: "No items in this order belong to you" });
        }

        order.items = updatedItems;
        order.statusHistory.push({ status: `Seller updated to ${status}`, updatedAt: new Date() });
        await order.save();

        res.status(200).json({ success: true, message: `Order status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};