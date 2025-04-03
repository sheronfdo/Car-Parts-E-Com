const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password"); // Exclude password
        if (!user || user.status === "inactive") {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    const { name, phone, profileImage, password, addresses } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user || user.status === "inactive") {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Update fields if provided
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (profileImage) user.profileImage = profileImage; // URL from /api/media/upload
        if (password) user.password = await bcrypt.hash(password, 10);
        if (addresses) {
            // Validate and update addresses
            if (!Array.isArray(addresses)) {
                return res.status(400).json({ success: false, message: "Addresses must be an array" });
            }
            user.addresses = addresses.map(addr => ({
                street: addr.street,
                city: addr.city,
                country: addr.country,
                postalCode: addr.postalCode,
                isDefault: addr.isDefault || false
            }));
            // Ensure only one default address
            const defaultCount = user.addresses.filter(addr => addr.isDefault).length;
            if (defaultCount > 1) {
                return res.status(400).json({ success: false, message: "Only one address can be default" });
            }
        }

        await user.save();
        res.status(200).json({ success: true, message: "Profile updated successfully", data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete (deactivate) user profile
exports.deleteProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.status === "inactive") {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.status = "inactive"; // Soft delete
        await user.save();
        res.status(200).json({ success: true, message: "Profile deactivated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};