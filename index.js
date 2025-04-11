const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");
const path = require("path");
const User = require("./models/User");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const sellerRoutes = require("./routes/seller");
const buyerRoutes = require("./routes/buyer");
const assetRoutes = require("./routes/asset");
const profileRoutes = require("./routes/profile");
const courierRoutes = require("./routes/courier");


const app = express();

app.use(cors({
    origin:  "*" ,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
}));

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    // Optional: Ensure correct MIME types and fallback
    setHeaders: (res, filePath) => {
        res.setHeader("Content-Type", require("mime-types").lookup(filePath) || "application/octet-stream");
    }
}));

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
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/media", assetRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/courier", courierRoutes);




// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





//
// const Category = require("./models/Category");
//
// const seedCategories = async () => {
//     try {
//         await Category.deleteMany({});
//
//         const categories = [
//             { name: "Engine & Transmission", subcategories: [
//                     "Engine Components", "Transmission & Drivetrain", "Fuel System", "Cooling System"
//                 ]},
//             { name: "Braking System", subcategories: [
//                     "Brake Pads & Discs", "Brake Calipers", "ABS Components", "Brake Lines & Hoses"
//                 ]},
//             { name: "Suspension & Steering", subcategories: [
//                     "Shock Absorbers & Struts", "Control Arms", "Power Steering Pumps", "Tie Rods & Ball Joints"
//                 ]},
//             { name: "Electrical & Electronics", subcategories: [
//                     "Batteries", "Alternators", "Starters", "Sensors", "Ignition System"
//                 ]},
//             { name: "Body & Exterior", subcategories: [
//                     "Doors, Bumpers, Fenders", "Headlights, Taillights, Fog Lights", "Mirrors & Windshield Components"
//                 ]},
//             { name: "Interior & Accessories", subcategories: [
//                     "Seats & Seat Covers", "Dashboards & Instrument Clusters", "Car Audio & Entertainment Systems"
//                 ]},
//             { name: "Exhaust & Emission", subcategories: [
//                     "Mufflers", "Catalytic Converters", "Exhaust Pipes & Manifolds"
//                 ]},
//             { name: "Wheels & Tires", subcategories: [
//                     "Rims & Alloy Wheels", "Tires", "Wheel Bearings & Hubs"
//                 ]},
//             { name: "Fluids & Maintenance", subcategories: [
//                     "Engine Oil", "Coolants", "Transmission Fluids", "Brake Fluids"
//                 ]},
//             { name: "Detailing", subcategories: [
//                     "Car wash items an all"
//                 ]}
//         ];
//
//         for (const cat of categories) {
//             const mainCat = new Category({ name: cat.name, status: "active" });
//             await mainCat.save();
//
//             for (const subCatName of cat.subcategories) {
//                 const subCat = new Category({ name: subCatName, parentCategory: mainCat._id, status: "active" });
//                 await subCat.save();
//             }
//         }
//
//         console.log("Categories and subcategories seeded successfully");
//     } catch (err) {
//         console.error("Error seeding categories:", err);
//     }
// };
//
// mongoose.connection.once("open", () => seedCategories());