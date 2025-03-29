const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.addCourier = async (req, res) => {
    const {email, password, name, phone, region} = req.body;

    try {
        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(400).json({success: false, message: "Email already exists"});
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
            data: {courierId: courier._id}
        });
    } catch (err) {
        res.status(500).json({success: false, message: err.message});
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
        await User.deleteOne({ _id: id });
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
        await User.deleteOne({ _id: id });
        res.json({ success: true, message: "Buyer deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};