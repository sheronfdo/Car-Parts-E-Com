const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ["admin", "courier", "seller", "buyer"]
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: String,
    phone: String,
    storeName: String, // For sellers
    region: String, // For couriers
    availability: String, // For couriers: "active" or "inactive"
    status: {
        type: String,
        default: "active" // Can be "pending" for sellers if approval is needed
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

module.exports = mongoose.model("User", userSchema);