const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log("MongoDB connected successfully");

        // Check if an admin user exists; if not, create one
        const adminExists = await User.findOne({role: "admin"});
        if (!adminExists) {
            const bcrypt = require("bcryptjs");
            const hashedPassword = await bcrypt.hash("adminpassword", 10); // Default password
            const adminUser = new User({
                role: "admin",
                email: "admin@example.com",
                password: hashedPassword,
                name: "Admin User",
                phone: "+1234567890"
            });
            await adminUser.save();
            console.log("Default admin user created with email: admin@example.com, password: adminpassword");
        }
        // // Check if an admin user exists; if not, create one
        // const courierExists = await User.findOne({role: "courier"});
        // if (!courierExists) {
        //     const bcrypt = require("bcryptjs");
        //     const hashedPassword = await bcrypt.hash("courierpassword", 10); // Default password
        //     const courierUser = new User({
        //         role: "courier",
        //         email: "courier@example.com",
        //         password: hashedPassword,
        //         name: "courier User",
        //         phone: "+1234567890"
        //     });
        //     await courierUser.save();
        //     console.log("Default courier user created with email: courier@example.com, password: courierpassword");
        // }
        // // Check if an admin user exists; if not, create one
        // const sellerExists = await User.findOne({role: "seller"});
        // if (!sellerExists) {
        //     const bcrypt = require("bcryptjs");
        //     const hashedPassword = await bcrypt.hash("sellerpassword", 10); // Default password
        //     const sellerUser = new User({
        //         role: "seller",
        //         email: "seller@example.com",
        //         password: hashedPassword,
        //         name: "seller User",
        //         phone: "+1234567890"
        //     });
        //     await sellerUser.save();
        //     console.log("Default seller user created with email: seller@example.com, password: sellerpassword");
        // }
        // // Check if an admin user exists; if not, create one
        // const buyerExists = await User.findOne({role: "buyer"});
        // if (!buyerExists) {
        //     const bcrypt = require("bcryptjs");
        //     const hashedPassword = await bcrypt.hash("buyerpassword", 10); // Default password
        //     const buyerUser = new User({
        //         role: "buyer",
        //         email: "buyer@example.com",
        //         password: hashedPassword,
        //         name: "buyer User",
        //         phone: "+1234567890"
        //     });
        //     await buyerUser.save();
        //     console.log("Default buyer user created with email: buyer@example.com, password: buyerpassword");
        // }
    })
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// Routes
app.use("/api/auth", authRoutes); // Public authentication routes
app.use("/api/admin", adminRoutes); // Admin-only routes

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));