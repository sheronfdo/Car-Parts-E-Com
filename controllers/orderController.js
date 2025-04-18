const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const crypto = require("crypto");
require("dotenv").config();

const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
const PAYHERE_NOTIFY_URL = "http://localhost:3000/api/buyer/order/notify";

// Generate PayHere hash
const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
    const hashString = `${merchantId}${orderId}${amount.toFixed(2)}${currency}${merchantSecret}`;
    return crypto.createHash("md5").update(hashString).digest("hex").toUpperCase();
};


exports.createOrder = async (req, res) => {
    const buyerId = req.user.id;
    const { items: requestedItems, shippingAddress } = req.body;

    try {
        let orderItems = [];
        let cart;

        const user = await User.findById(buyerId);

        // Handle user addresses
        if (user.addresses.length === 0) {
            user.addresses.push({ ...shippingAddress, isDefault: true });
        } else {
            const exists = user.addresses.some(addr =>
                addr.street === shippingAddress.street &&
                addr.city === shippingAddress.city &&
                addr.district === shippingAddress.district &&
                addr.country === shippingAddress.country &&
                addr.postalCode === shippingAddress.postalCode
            );
            if (!exists) {
                user.addresses.push(shippingAddress);
            }
        }
        await user.save();
        const defaultAddress = user.addresses.find(addr => addr.isDefault) || {};

        // Step 1: Prepare order items
        if (requestedItems && Array.isArray(requestedItems) && requestedItems.length > 0) {
            for (const { productId, quantity } of requestedItems) {
                const product = await Product.findOne({ _id: productId, status: "active" });
                if (!product) {
                    return res.status(404).json({ success: false, message: `Product ${productId} not found` });
                }
                if (product.stock < quantity) {
                    return res.status(400).json({ success: false, message: `Insufficient stock for ${product.title}` });
                }
                orderItems.push({
                    productId,
                    quantity,
                    price: product.price,
                    courierDetails: { courierId: null, trackingNumber: null }, // Initialize courierDetails
                    courierStatus: "Pending", // Initialize courierStatus
                    statusHistory: [{ // Initialize statusHistory for the item
                        status: "Order created",
                        updatedBy: { role: "system", userId: null },
                        updatedAt: Date.now()
                    }]
                });
            }
        } else {
            cart = await Cart.findOne({ buyerId });
            if (!cart || cart.items.length === 0) {
                return res.status(400).json({ success: false, message: "Cart is empty" });
            }
            for (const item of cart.items) {
                const product = await Product.findOne({ _id: item.productId, status: "active" });
                if (!product) {
                    return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
                }
                if (product.stock < item.quantity) {
                    return res.status(400).json({ success: false, message: `Insufficient stock for ${product.title}` });
                }
                orderItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: product.price,
                    courierDetails: { courierId: null, trackingNumber: null }, // Initialize courierDetails
                    courierStatus: "Pending", // Initialize courierStatus
                    statusHistory: [{ // Initialize statusHistory for the item
                        status: "Order created",
                        updatedBy: { role: "system", userId: null },
                        updatedAt: Date.now()
                    }]
                });
            }
        }

        // Step 2: Calculate total
        const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // Step 3: Create order
        const order = new Order({
            buyerId,
            items: orderItems,
            total,
            status: "Pending",
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                district: shippingAddress.district,
                country: shippingAddress.country,
                postalCode: shippingAddress.postalCode
            }
        });
        await order.save();

        // Step 4: Prepare PayHere payment data
        const payhereData = {
            sandbox: true,
            merchant_id: PAYHERE_MERCHANT_ID,
            return_url: "http://localhost:5173/success",
            cancel_url: "http://localhost:5173/cancel",
            notify_url: PAYHERE_NOTIFY_URL,
            order_id: order._id.toString(),
            items: orderItems.map((item) => `Product ${item.productId}`).join(", "),
            currency: "LKR",
            amount: total.toFixed(2),
            first_name: req.user.firstName || "Buyer",
            last_name: req.user.lastName || "",
            email: req.user.email || "sample@mail.com",
            phone: req.user.phone || "1234567890",
            address: defaultAddress.street || "No Address Provided",
            city: defaultAddress.city || "Colombo",
            country: defaultAddress.country || "Sri Lanka",
            delivery_address: shippingAddress.street,
            delivery_city: shippingAddress.city,
            delivery_country: shippingAddress.country,
            hash: generatePayHereHash(PAYHERE_MERCHANT_ID, order._id.toString(), total, "LKR", PAYHERE_MERCHANT_SECRET),
        };

        console.log("PayHere Data:", payhereData); // Debugging line

        res.status(200).json({
            success: true,
            message: "Order created, proceed to payment",
            data: { orderId: order._id, payhereData },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.notifyOrder = async (req, res) => {
    const { merchant_id, order_id, status_code, md5sig, amount, currency } = req.body;

    try {
        const sanitizedAmount = typeof amount === 'string'
            ? amount.replace(/,/g, '')
            : amount;
        const numericAmount = parseFloat(sanitizedAmount);

        if (isNaN(numericAmount)) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount format"
            });
        }

        // Verify hash
        const localHash = generatePayHereHash(
            merchant_id,
            order_id,
            numericAmount, // Pass as number
            currency,
            PAYHERE_MERCHANT_SECRET
        );

        if (md5sig !== localHash) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Update order status and item-level statusHistory based on payment status
        let newStatus;
        if (status_code === "2") { // Payment completed
            newStatus = "Confirmed";
            // Update statusHistory for each item
            order.items.forEach(item => {
                item.statusHistory.push({
                    status: "Order confirmed",
                    updatedBy: { role: "system", userId: null },
                    updatedAt: Date.now()
                });
                item.sellerStatus = "Accepted"; // Seller can now process the item
            });

            // Update product stock
            for (const item of order.items) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { stock: -item.quantity } }
                );
            }

            // Clear cart items that were ordered
            const cart = await Cart.findOne({ buyerId: order.buyerId });
            if (cart) {
                cart.items = cart.items.filter((cartItem) => {
                    const orderedItem = order.items.find((o) => o.productId.toString() === cartItem.productId.toString());
                    if (!orderedItem) return true;
                    if (cartItem.quantity > orderedItem.quantity) {
                        cartItem.quantity -= orderedItem.quantity;
                        return true;
                    }
                    return false;
                });
                await cart.save();
            }
        } else if (status_code === "0") { // Payment pending
            newStatus = "Pending";
            // Update statusHistory for each item
            order.items.forEach(item => {
                item.statusHistory.push({
                    status: "Order payment pending",
                    updatedBy: { role: "system", userId: null },
                    updatedAt: Date.now()
                });
            });
        } else if (status_code === "-1" || status_code === "-2") { // Payment cancelled or failed
            newStatus = "Cancelled";
            // Update statusHistory for each item
            order.items.forEach(item => {
                item.statusHistory.push({
                    status: "Order cancelled due to payment failure",
                    updatedBy: { role: "system", userId: null },
                    updatedAt: Date.now()
                });
                item.sellerStatus = "Cancelled"; // Reflect cancellation at item level
            });
        }

        // Update the top-level order status based on item statuses
        const allConfirmed = order.items.every(item => item.sellerStatus === "Accepted");
        const anyCancelled = order.items.some(item => item.sellerStatus === "Cancelled");
        if (newStatus === "Confirmed" && allConfirmed) {
            order.status = "Confirmed";
        } else if (newStatus === "Pending") {
            order.status = "Pending";
        } else if (newStatus === "Cancelled" || anyCancelled) {
            order.status = "Cancelled";
        }

        await order.save();
        res.status(200).send("OK");
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getOrders = async (req, res) => {
    const buyerId = req.user.id;
    try {
        const orders = await Order.find({ buyerId }).populate(
            "items.productId",
            "title price condition brand images"
        );

        // Transform the orders into an item-level structure with unified status
        const itemLevelData = orders.flatMap(order => {
            return order.items.map(item => {
                let unifiedStatus = "Payment Pending"; // Default status

                // Map the statuses to a unified status
                if (order.status === "Confirmed") {
                    unifiedStatus = "Payment Confirmed";
                }

                if (order.status === "Cancelled" || item.sellerStatus === "Cancelled") {
                    unifiedStatus = "Cancelled";
                } else if (item.sellerStatus === "Accepted") {
                    unifiedStatus = "Order Accepted";
                } else if (item.sellerStatus === "Processing") {
                    unifiedStatus = "Processing";
                } else if (item.sellerStatus === "Shipped") {
                    if (item.courierStatus === "Pending") {
                        unifiedStatus = "Shipped - Awaiting Courier";
                    } else if (item.courierStatus === "Picked Up") {
                        unifiedStatus = "Picked Up by Courier";
                    } else if (item.courierStatus === "In Transit") {
                        unifiedStatus = "In Transit";
                    } else if (item.courierStatus === "Out for Delivery") {
                        unifiedStatus = "Out for Delivery";
                    } else if (item.courierStatus === "Delivered" && item.sellerStatus === "Delivered") {
                        unifiedStatus = "Delivered";
                    } else if (item.courierStatus === "Failed Delivery") {
                        unifiedStatus = "Delivery Failed";
                    }
                } else if (item.sellerStatus === "Delivered") {
                    unifiedStatus = "Delivered";
                }

                return {
                    _id: order._id,
                    shippingAddress: order.shippingAddress,
                    buyerId: order.buyerId,
                    items: [{
                        ...item.toObject(),
                        orderStatus:unifiedStatus // Add the unified status to the item
                    }],
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    __v: order.__v
                };
            });
        });

        res.status(200).json({ success: true, data: itemLevelData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.cancelOrder = async (req, res) => {
    const { id } = req.params; // orderId
    const { productId } = req.body; // Optional productId for item-level cancellation

    try {
        const order = await Order.findOne({ _id: id, buyerId: req.user.id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Check if any item has been accepted (sellerStatus !== "Pending")
        const hasAcceptedItems = order.items.some(item => item.sellerStatus !== "Pending" && item.sellerStatus !== "Cancelled");
        if (hasAcceptedItems) {
            return res.status(400).json({ success: false, message: "Order cannot be cancelled as some items have been accepted" });
        }

        // If order status is not Pending, cancellation is not allowed
        if (order.status !== "Pending") {
            return res.status(400).json({ success: false, message: "Order cannot be cancelled" });
        }

        if (productId) {
            // Item-level cancellation
            const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);
            if (itemIndex === -1) {
                return res.status(404).json({ success: false, message: "Item not found in order" });
            }

            const item = order.items[itemIndex];
            // Update item-level status and history
            item.sellerStatus = "Cancelled";
            item.statusHistory.push({
                status: "Item cancelled by buyer",
                updatedBy: { role: "buyer", userId: req.user.id },
                updatedAt: new Date()
            });

            // Restore stock for the cancelled item
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } }
            );

            // Recalculate order total
            order.total = order.items.reduce((sum, item) => {
                if (item.sellerStatus !== "Cancelled") {
                    return sum + item.price * item.quantity;
                }
                return sum;
            }, 0);

            // Update order status based on remaining items
            const allCancelled = order.items.every(item => item.sellerStatus === "Cancelled");
            if (allCancelled) {
                order.status = "Cancelled";
            } else {
                order.status = "Pending"; // Some items remain active
            }
        } else {
            // Order-level cancellation (original behavior)
            order.status = "Cancelled";
            for (const item of order.items) {
                item.sellerStatus = "Cancelled";
                item.statusHistory.push({
                    status: "Order cancelled by buyer",
                    updatedBy: { role: "buyer", userId: req.user.id },
                    updatedAt: new Date()
                });

                // Restore stock for each item
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { stock: item.quantity } }
                );
            }
        }

        await order.save();
        res.json({ success: true, message: "Order cancelled successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.trackOrder = async (req, res) => {
    const { id } = req.params; // orderId
    const { productId } = req.body; // productId to specify the item
    const buyerId = req.user.id; // Ensure the order belongs to the buyer

    try {
        // Validate productId presence
        if (!productId) {
            return res.status(400).json({ success: false, message: "productId is required in the request body" });
        }

        // Find the order and populate product details for items
        const order = await Order.findOne({ _id: id, buyerId })
            .populate("items.productId", "title price condition brand images")
            .select("items shippingAddress createdAt updatedAt");

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Find the specific item in the order
        const item = order.items.find(item => item.productId._id.toString() === productId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found in order" });
        }

        // Construct the tracking data for the specific item
        const trackingData = {
            orderId: order._id,
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            item: {
                productId: item.productId, // Populated product details
                quantity: item.quantity,
                price: item.price,
                sellerStatus: item.sellerStatus,
                courierStatus: item.courierStatus,
                courierDetails: item.courierDetails,
                statusHistory: item.statusHistory
            }
        };

        res.json({ success: true, data: trackingData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.saveAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.shippingAddress = req.body.address;
        await user.save();
        res.json({ success: true, message: "Address saved successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};