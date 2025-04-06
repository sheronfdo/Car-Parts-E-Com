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

// Create Order
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
                orderItems.push({ productId, quantity, price: product.price });
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
                orderItems.push({ productId: item.productId, quantity: item.quantity, price: product.price });
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
            sandbox:true,
            merchant_id: PAYHERE_MERCHANT_ID,
            return_url: "http://localhost:3000/success",
            cancel_url: "http://localhost:3000/cancel",
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

        res.status(200).json({
            success: true,
            message: "Order created, proceed to payment",
            data: { orderId: order._id, payhereData },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Notify Order (PayHere Callback)
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

        // Update order status
        if (status_code === "2") { // Payment completed
            order.status = "Confirmed";
            for (const item of order.items) {
                await Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.quantity } });
            }
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
        } else if (status_code === "0") {
            order.status = "Pending";
        } else if (status_code === "-1" || status_code === "-2") {
            order.status = "Cancelled";
        }

        await order.save();
        res.status(200).send("OK");
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get Orders
exports.getOrders = async (req, res) => {
    const buyerId = req.user.id;
    try {
        const orders = await Order.find({ buyerId }).populate(
            "items.productId",
            "title price condition brand images"
        );
        res.status(200).json({ success: true, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.cancelOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findOne({ _id: id, buyerId: req.user.id });
        if (!order || order.status !== "Pending") {
            return res.status(400).json({ success: false, message: "Order cannot be cancelled" });
        }

        order.status = "Cancelled";
        order.statusHistory.push({ status: "Cancelled", updatedAt: new Date() });

        for (const item of order.items) {
            await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
        }

        await order.save();
        res.json({ success: true, message: "Order cancelled successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.trackOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findById(id).select("status statusHistory");
        if (!order) throw new Error("Order not found");
        res.json({ success: true, data: order });
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