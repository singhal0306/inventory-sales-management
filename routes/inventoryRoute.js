const express = require("express");
const {
  inventory,
  addtoinventory,
  addStock,
  archiveFromInventory,
  restoreToInventory,
} = require("../controllers/inventryController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(protect);
router.get("/getitems", inventory);
router.post("/addtoinventory", addtoinventory);
router.post("/addstock/:id", addStock);
router.patch("/archive/:id", archiveFromInventory);
router.patch("/restore/:id", restoreToInventory);
module.exports = router;