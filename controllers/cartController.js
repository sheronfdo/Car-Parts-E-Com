const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add item to cart
exports.addToCart = async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const buyerId = req.user.id;

    try {
        // Validate product exists and is active
        const product = await Product.findOne({ _id: productId, status: "active" });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or unavailable" });
        }

        // Check stock availability
        if (product.stock < quantity) {
            return res.status(400).json({ success: false, message: "Insufficient stock" });
        }

        // Find or create cart
        let cart = await Cart.findOne({ buyerId });
        if (!cart) {
            cart = new Cart({ buyerId, items: [] });
        }

        // Check if product already in cart
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex > -1) {
            // Update quantity if item exists
            const newQuantity = cart.items[itemIndex].quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({ success: false, message: "Total quantity exceeds stock" });
            }
            cart.items[itemIndex].quantity = newQuantity;
        } else {
            // Add new item
            cart.items.push({ productId, quantity });
        }

        await cart.save();

        res.status(200).json({ success: true, message: "Item added to cart", data: cart });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
    const { productId } = req.params;
    const buyerId = req.user.id;

    try {
        const cart = await Cart.findOne({ buyerId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Find and remove item
        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        cart.items.splice(itemIndex, 1);
        await cart.save();

        res.status(200).json({ success: true, message: "Item removed from cart", data: cart });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// View cart
exports.getCart = async (req, res) => {
    const buyerId = req.user.id;

    try {
        const cart = await Cart.findOne({ buyerId })
            .populate({
                path: "items.productId",
                select: "title price stock condition brand images",
                match: { status: "active" } // Only include active products
            });

        if (!cart) {
            return res.status(200).json({ success: true, data: { items: [], total: 0 } });
        }

        // Filter out any items where product is no longer available
        cart.items = cart.items.filter(item => item.productId !== null);

        // Calculate total price
        const total = cart.items.reduce((sum, item) => {
            return sum + (item.productId.price * item.quantity);
        }, 0);

        await cart.save(); // Save any changes (e.g., filtered items)

        res.status(200).json({ success: true, data: { items: cart.items, total } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Clear cart (optional)
exports.clearCart = async (req, res) => {
    const buyerId = req.user.id;

    try {
        const cart = await Cart.findOne({ buyerId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        cart.items = [];
        await cart.save();

        res.status(200).json({ success: true, message: "Cart cleared", data: cart });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};