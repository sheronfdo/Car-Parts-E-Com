const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    sellerStatus: {
        type: String,
        enum: ["Accepted", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
        default: "Pending"
    },
    courierDetails: {
        courierId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        trackingNumber: String
    },
    courierStatus: {
        type: String,
        enum: ["Pending", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Failed Delivery"],
        default: "Pending"
    },
    statusHistory: [{
        status: String,
        updatedBy: {
            role: { type: String, enum: ["seller", "courier", "buyer", "system"], required: true },
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        },
        updatedAt: { type: Date, default: Date.now }
    }],
    complaint: {
        type: {
            description: { type: String, maxlength: 500 },
            status: { 
                type: String, 
                enum: ["Open", "Resolved", "Closed", "Refund Approved", "Refund Rejected"], 
                default: "Open" 
            },
            refundRequested: { type: Boolean, default: false },
            refundAmount: { type: Number, min: 0 },
            createdAt: { type: Date },
            resolvedAt: { type: Date },
            resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        },
        required: false 
    }
});

const orderSchema = new mongoose.Schema({
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Shipped", "Accepted", "Delivered", "Cancelled"],
        default: "Pending",
    },
    shippingAddress: {
        street: String,
        city: String,
        district: {
            type: String,
            enum: [
                "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
                "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
                "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
                "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
                "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
            ],
            required: true
        },
        country: String,
        postalCode: String
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre("save", function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("Order", orderSchema);