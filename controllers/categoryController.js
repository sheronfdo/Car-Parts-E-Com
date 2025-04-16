const Category = require("../models/Category");

// Create a new category (unchanged)
exports.createCategory = async (req, res) => {
    const { name, parentCategory } = req.body;

    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category name already exists" });
        }

        if (parentCategory) {
            const parent = await Category.findById(parentCategory);
            if (!parent || parent.status === "deleted") {
                return res.status(404).json({ success: false, message: "Parent category not found or deleted" });
            }
        }

        const category = new Category({
            name,
            parentCategory: parentCategory || null
        });
        await category.save();

        res.status(201).json({
            success: true,
            data: { categoryId: category._id, name: category.name }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        // Fetch all active categories with populated parentCategory
        const categories = await Category.find({ status: "active" }).populate("parentCategory", "name");

        // Separate parent categories (those with no parentCategory) and subcategories
        const parentCategories = categories.filter(cat => !cat.parentCategory);
        const subCategories = categories.filter(cat => cat.parentCategory);

        // Map parent categories and attach their subcategories
        const result = parentCategories.map(parent => {
            const subCategoryList = subCategories
                .filter(sub => sub.parentCategory && sub.parentCategory._id.toString() === parent._id.toString())
                .map(sub => ({
                    _id: sub._id,
                    name: sub.name,
                    parentCategory: sub.parentCategory,
                    status: sub.status,
                    createdAt: sub.createdAt,
                    updatedAt: sub.updatedAt,
                    __v: sub.__v
                }));

            return {
                _id: parent._id,
                name: parent.name,
                parentCategory: parent.parentCategory, // null for parent categories
                status: parent.status,
                createdAt: parent.createdAt,
                updatedAt: parent.updatedAt,
                __v: parent.__v,
                categoryOption: subCategoryList
            };
        });

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get a single category by ID (exclude if deleted)
exports.getCategoryById = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findOne({ _id: id, status: "active" }).populate("parentCategory", "name");
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found or deleted" });
        }
        res.json({ success: true, data: category });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update a category (unchanged except for status check)
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, parentCategory } = req.body;

    try {
        const category = await Category.findById(id);
        if (!category || category.status === "deleted") {
            return res.status(404).json({ success: false, message: "Category not found or deleted" });
        }

        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                return res.status(400).json({ success: false, message: "Category name already exists" });
            }
        }

        if (parentCategory) {
            const parent = await Category.findById(parentCategory);
            if (!parent || parent.status === "deleted") {
                return res.status(404).json({ success: false, message: "Parent category not found or deleted" });
            }
            if (parentCategory === id) {
                return res.status(400).json({ success: false, message: "Category cannot be its own parent" });
            }
        }

        category.name = name || category.name;
        category.parentCategory = parentCategory !== undefined ? parentCategory : category.parentCategory;
        category.updatedAt = Date.now();
        await category.save();

        res.json({
            success: true,
            message: "Category updated",
            data: { categoryId: category._id, name: category.name }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete a category (set status to "deleted")
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        if (category.status === "deleted") {
            return res.status(400).json({ success: false, message: "Category already deleted" });
        }

        // Check if category has active subcategories
        const subcategories = await Category.find({ parentCategory: id, status: "active" });
        if (subcategories.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category with active subcategories" });
        }

        category.status = "deleted";
        category.updatedAt = Date.now();
        await category.save();

        res.json({ success: true, message: "Category marked as deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};