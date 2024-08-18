const express = require("express");
const {
  inventory,
  addtoinventory,
  deleteFromInventory,
} = require("../controllers/inventryController");
const { protect } = require("../controllers/authMiddleware");
const router = express.Router();

router.get("/getitems", protect, inventory);
router.post("/addtoinventory", protect, addtoinventory);
router.get("/delete/:id", protect, deleteFromInventory)
module.exports = router;