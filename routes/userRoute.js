const express = require("express");
const { protect } = require("../controllers/authMiddleware");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
} = require("../controllers/userController");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/getuser", protect, getUser);

module.exports = router;
