if (require.main === module) require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./utils/logger");
const createApp = require("./app");

const startServer = async () => {
  const port = process.env.port || 8000;
  mongoose.connection.on("connected", () => {
    logger.info({ event: "database.connected", database: mongoose.connection.name }, "MongoDB connected");
  });
  mongoose.connection.on("error", (err) => {
    logger.error({ event: "database.connection.error", err }, "MongoDB connection error");
  });
  await mongoose.connect(process.env.mongoUrl);
  const server = createApp().listen(port, () => {
    logger.info({ event: "server.started", port }, "Server listening");
  });
  server.on("error", (err) => {
    logger.fatal({ event: "server.listen.failed", err, port }, "Server failed to start");
    process.exitCode = 1;
  });
  return server;
};

const reportStartupFailure = (err) => {
  logger.fatal({ event: "server.start.failed", err }, "Server failed to start");
  process.exitCode = 1;
};

if (require.main === module) startServer().catch(reportStartupFailure);

module.exports = { startServer, reportStartupFailure };
