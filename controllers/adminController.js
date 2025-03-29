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