const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
    const {email, password, role, name, phone, storeName} = req.body;

    // Only allow public registration for "buyer" and "seller"
    if (!["buyer", "seller"].includes(role)) {
        return res.status(400).json({success: false, message: "Invalid role for public registration"});
    }

    try {
        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(400).json({success: false, message: "Email already exists"});
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            email,
            password: hashedPassword,
            role,
            name,
            phone,
            storeName: role === "seller" ? storeName : undefined,
            status: role === "seller" ? "pending" : "active"
        });
        await user.save();

        const token = jwt.sign(
            {id: user._id, role: user.role},
            process.env.JWT_SECRET,
            {expiresIn: "1h"}
        );

        res.status(201).json({
            success: true,
            data: {userId: user._id, token}
        });
    } catch (err) {
        res.status(500).json({success: false, message: err.message});
    }
};

exports.login = async (req, res) => {
    const {email, password} = req.body;

    try {
        const user = await User.findOne({email});
        if (!user) {
            return res.status(401).json({success: false, message: "Invalid credentials"});
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({success: false, message: "Invalid credentials"});
        }

        // If sellers need approval, uncomment the next block:
        if (user.status === "deleted") {
            return res.status(403).json({success: false, message: "Account has suspended"});
        }

        if (user.status === "inactive") {
            return res.status(403).json({success: false, message: "Account is inactive"});
        }

        if (user.role === "seller" && user.status !== "active") {
            return res.status(403).json({success: false, message: "Account pending approval"});
        }

        const token = jwt.sign(
            {id: user._id, role: user.role},
            process.env.JWT_SECRET,
            {expiresIn: "1h"}
        );

        res.json({
            success: true,
            data: {userId: user._id, token, role : user.role, status: user.status}
        });
    } catch (err) {
        res.status(500).json({success: false, message: err.message});
    }
};