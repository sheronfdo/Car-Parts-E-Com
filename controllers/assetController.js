const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "video/mp4"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPEG, PNG, and MP4 allowed."));
        }
    }
});

// Upload assets handler
exports.uploadAssets = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }
        const mediaData = req.files.map(file => ({
            id: file.filename,
            url: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
        }));
        res.status(200).json({
            success: true,
            message: "Media uploaded successfully",
            data: mediaData
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Export Multer middleware for multiple files
exports.uploadMiddleware = upload.array("media", 10);