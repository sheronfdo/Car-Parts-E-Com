const express = require("express");
const {
    getAdmins,
    addAdmin,
    deleteAdmin,
    getCouriers,
    addCourier,
    updateCourier,
    deleteCourier,
    getPendingSellers,
    approveSeller,
    deleteSeller,
    deleteBuyer,
    getAllSellers,
    getAllBuyers
} = require("../controllers/adminController");
const auth = require("../middleware/auth");
const checkRole = require("../middleware/checkRole");
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

const router = express.Router();

// Protect routes with authentication and role check
router.use(auth);
router.use(checkRole("admin"));

// Admin Management
router.get("/admins", getAdmins);
router.post("/admins", addAdmin);
router.delete("/admins/:id", deleteAdmin);

// Courier Management
router.get("/couriers", getCouriers);
router.post("/couriers", addCourier);
router.put("/couriers/:id", updateCourier);
router.delete("/couriers/:id", deleteCourier);

// Seller Management
router.get("/sellers", getAllSellers);
router.get("/sellers/pending", getPendingSellers);
router.put("/sellers/:id", approveSeller);
router.delete("/sellers/:id", deleteSeller);

// Buyer Management
router.get("/buyers", getAllBuyers);
router.delete("/buyers/:id", deleteBuyer);

//Category Management
router.post("/categories", createCategory);
router.get("/categories", getAllCategories);
router.get("/categories/:id", getCategoryById);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

module.exports = router;