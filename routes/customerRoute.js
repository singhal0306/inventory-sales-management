const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
} = require("../controllers/customerController");

const router = express.Router();

router.use(protect);
router.get("/", getCustomers);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.post("/:id/restore", restoreCustomer);

module.exports = router;
