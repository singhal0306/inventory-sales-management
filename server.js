require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const logger = require("./utils/logger");
const requestContext = require("./middleware/requestContext");

mongoose.connect(process.env.mongoUrl);

const userRoute = require("./routes/userRoute");
const inventoryRoute = require("./routes/inventoryRoute")
const billingRoute = require("./routes/billingRoute")
const customerRoute = require("./routes/customerRoute");
const analyticsRoute = require("./routes/analyticsRoute");
const errorHandler = require("./middleware/errorMiddleware");

const app = express();
const port = process.env.port || 8000;

const isProduction =
  process.env.nodeEnv === "production" || process.env.NODE_ENV === "production";
const allowedOrigins = new Set(
  (process.env.clientOrigin || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);
const isAllowedDevelopmentOrigin = (origin) => {
  if (isProduction) return false;

  try {
    const { protocol, hostname } = new URL(origin);
    return (
      (protocol === "http:" || protocol === "https:") &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)
    );
  } catch {
    return false;
  }
};

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(requestContext);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isAllowedDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error("Origin is not allowed by CORS");
      error.statusCode = 403;
      callback(error);
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Traceparent",
      "X-Trace-Id",
      "X-Span-Id",
      "X-Client-Id",
    ],
    exposedHeaders: ["Traceparent", "X-Trace-Id", "X-Span-Id", "X-Client-Id"],
  })
);

mongoose.connection.on("connected", () => {
  logger.info({ event: "database.connected", database: mongoose.connection.name }, "MongoDB connected");
});

mongoose.connection.on("error", (err) => {
  logger.error({ event: "database.connection.error", err }, "MongoDB connection error");
});

app.use("/api/user", userRoute);
app.use("/api/inventory", inventoryRoute)
app.use("/api/bill", billingRoute);
app.use("/api/customer", customerRoute);
app.use("/api/analytics", analyticsRoute);

app.get("/", (req, res) => {
  res.send("Hello from the server!");
});

app.use(errorHandler);

app.listen(port, (err) => {
  if (err) {
    logger.fatal({ event: "server.listen.failed", err, port }, "Server failed to start");
    process.exitCode = 1;
    return;
  }
  logger.info({ event: "server.started", port }, "Server listening");
});
