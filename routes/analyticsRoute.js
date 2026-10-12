const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { salesReport, exportSales } = require("../controllers/analyticsController");
const router = express.Router();
router.use(protect);
router.get("/sales", salesReport);
router.get("/sales/export", exportSales);
module.exports = router;
