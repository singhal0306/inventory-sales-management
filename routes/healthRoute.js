const express = require("express");
const { getHealth, getLiveness } = require("../controllers/healthController");
const router = express.Router();

// Monitoring probes do not require a user session.
router.get("/", getHealth);
router.get("/live", getLiveness);

module.exports = router;
