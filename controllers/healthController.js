const mongoose = require("mongoose");

const databaseIsReady = async () => {
  if (mongoose.connection.readyState !== 1) return false;

  let timeout;
  try {
    const result = await Promise.race([
      mongoose.connection.db.command({ ping: 1 }),
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("Database health check timed out")), 1000);
      }),
    ]);
    return result.ok === 1;
  } catch {
    // Public health responses must not expose database errors or credentials.
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const healthResponse = (status) => ({
  status,
  service: process.env.SERVICE_NAME || "inventory-sales-management-api",
  timestamp: new Date().toISOString(),
  uptimeSeconds: Math.floor(process.uptime()),
});

const getHealth = async (req, res, next) => {
  try {
    const ready = await databaseIsReady();
    res.set("Cache-Control", "no-store");
    res.status(ready ? 200 : 503).json({
      ...healthResponse(ready ? "ok" : "error"),
      checks: { mongodb: { status: ready ? "up" : "down" } },
    });
  } catch (error) {
    next(error);
  }
};

const getLiveness = (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json(healthResponse("ok"));
};

module.exports = { getHealth, getLiveness };
