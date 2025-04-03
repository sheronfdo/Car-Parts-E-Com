const express = require("express");
const router = express.Router();
const { uploadAssets, uploadMiddleware } = require("../controllers/assetController");
const auth = require("../middleware/auth");



router.use(auth);
// Apply Multer middleware before the handler
router.post("/upload", uploadMiddleware, uploadAssets);

module.exports = router;