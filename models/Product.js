const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    price: {
        type: Number,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    condition: {
        type: String,
        enum: ["New", "Used", "Refurbished"],
        required: true
    },
    brand: String,
    oem: String,
    aftermarket: {
        type: Boolean,
        default: false
    },
    material: String,
    makeModel: [{
        make: String,
        model: String
    }],
    years: [Number],
    availability: {
        type: String,
        enum: ["In Stock", "Pre-order"],
        default: "In Stock"
    },
    images: [String],
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["active", "deleted"],
        default: "active"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Product", productSchema);