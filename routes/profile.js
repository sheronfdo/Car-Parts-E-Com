const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, deleteProfile } = require("../controllers/profileController");

const auth = require("../middleware/auth");

router.use(auth);
router.get("/", getProfile);
router.put("/", updateProfile);
router.delete("/", deleteProfile);

module.exports = router;