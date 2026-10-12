const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  getProfilePhoto,
  uploadProfilePhoto,
  deleteProfilePhoto,
  changePassword,
} = require("../controllers/userController");
const parseProfilePhoto = require("../middleware/profilePhotoUpload");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.get("/getuser", protect, getUser);
router.patch("/password", protect, changePassword);
router.get("/profile-photo", protect, getProfilePhoto);
router.post("/profile-photo", protect, parseProfilePhoto, uploadProfilePhoto);
router.delete("/profile-photo", protect, deleteProfilePhoto);

module.exports = router;
