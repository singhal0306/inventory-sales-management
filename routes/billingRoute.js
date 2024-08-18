const express = require("express");
const { protect } = require("../controllers/authMiddleware");
const {addNewBill, sendBillData} = require("../controllers/billController")
const router = express.Router();

// /api/bill/newbill
router.post("/newbill", addNewBill);
router.get("/allbills", sendBillData)
module.exports = router;