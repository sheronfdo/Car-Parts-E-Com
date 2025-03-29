const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.getAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: "admin" });
        res.json({ success: true, data: admins });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addAdmin = async (req, res) => {
    const { email, password, name, phone } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = new User({
            email,
            password: hashedPassword,
            role: "admin",
            name,
            phone,
            status: "active"
        });
        await admin.save();

        res.status(201).json({
            success: true,
            data: { adminId: admin._id }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        const admin = await User.findById(id);
        if (!admin || admin.role !== "admin") {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Prevent deleting the last admin
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) {
            return res.status(403).json({ success: false, message: "Cannot delete the last admin" });
        }
        admin.status = "deleted";
        admin.updatedAt = Date.now();
        await admin.save();
        res.json({ success: true, message: "Admin deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Courier Management ---
exports.getCouriers = async (req, res) => {
    try {
        const couriers = await User.find({ role: "courier" });
        res.json({ success: true, data: couriers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addCourier = async (req, res) => {
    const { email, password, name, phone, region } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const courier = new User({
            email,
            password: hashedPassword,
            role: "courier",
            name,
            phone,
            region,
            availability: "active",
            status: "active"
        });
        await courier.save();

        res.status(201).json({
            success: true,
            data: { courierId: courier._id }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateCourier = async (req, res) => {
    const { id } = req.params;
    const { name, phone, region, availability } = req.body;

    try {
        const courier = await User.findById(id);
        if (!courier || courier.role !== "courier") {
            return res.status(404).json({ success: false, message: "Courier not found" });
        }

        courier.name = name || courier.name;
        courier.phone = phone || courier.phone;
        courier.region = region || courier.region;
        courier.availability = availability || courier.availability;
        courier.updatedAt = Date.now();
        await courier.save();

        res.json({ success: true, message: "Courier updated", data: { courierId: courier._id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteCourier = async (req, res) => {
    const { id } = req.params;

    try {
        const courier = await User.findById(id);
        if (!courier || courier.role !== "courier") {
            return res.status(404).json({ success: false, message: "Courier not found" });
        }
        courier.status = "deleted";
        courier.updatedAt = Date.now();
        await courier.save();
        res.json({ success: true, message: "Courier deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPendingSellers = async (req, res) => {
    try {
        const pendingSellers = await User.find({ role: "seller", status: "pending" });
        res.json({ success: true, data: pendingSellers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.approveSeller = async (req, res) => {
    const { id } = req.params;
    try {
        const seller = await User.findById(id);
        if (!seller || seller.role !== "seller") {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }
        if (seller.status === "active") {
            return res.status(400).json({ success: false, message: "Seller already approved" });
        }
        seller.status = "active";
        seller.updatedAt = Date.now();
        await seller.save();
        res.json({ success: true, message: "Seller approved", data: { sellerId: seller._id } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteSeller = async (req, res) => {
    const { id } = req.params;
    try {
        const seller = await User.findById(id);
        if (!seller || seller.role !== "seller") {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }
        seller.status = "deleted";
        seller.updatedAt = Date.now();
        await seller.save();
        res.json({ success: true, message: "Seller deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteBuyer = async (req, res) => {
    const { id } = req.params;
    try {
        const buyer = await User.findById(id);
        if (!buyer || buyer.role !== "buyer") {
            return res.status(404).json({ success: false, message: "Buyer not found" });
        }
        buyer.status = "deleted";
        buyer.updatedAt = Date.now();
        await buyer.save();
        res.json({ success: true, message: "Buyer deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};