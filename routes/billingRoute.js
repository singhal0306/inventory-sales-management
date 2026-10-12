const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { addNewBill, sendBillData } = require("../controllers/billController");
const router = express.Router();

router.use(protect);
router.post("/newbill", addNewBill);
router.get("/allbills", sendBillData);
module.exports = router;