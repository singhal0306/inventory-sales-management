const express = require("express");
const { protect, requireAdmin } = require("../middleware/authMiddleware");
const { getUsers, updateUser } = require("../controllers/adminController");
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
router.get("/admin/users", protect, requireAdmin, getUsers);
router.patch("/admin/users/:id", protect, requireAdmin, updateUser);
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.get("/getuser", protect, getUser);
router.patch("/password", protect, changePassword);
router.get("/profile-photo", protect, getProfilePhoto);
router.post("/profile-photo", protect, parseProfilePhoto, uploadProfilePhoto);
router.delete("/profile-photo", protect, deleteProfilePhoto);

module.exports = router;
