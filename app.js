const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const requestContext = require("./middleware/requestContext");
const errorHandler = require("./middleware/errorMiddleware");

// Creating the app must not open a database connection or a listening socket.
const createApp = () => {
  const app = express();
  const isProduction =
    process.env.nodeEnv === "production" || process.env.NODE_ENV === "production";
  const allowedOrigins = new Set(
    (process.env.clientOrigin || "http://localhost:3000")
      .split(",").map((origin) => origin.trim()).filter(Boolean)
  );
  const isAllowedDevelopmentOrigin = (origin) => {
    if (isProduction) return false;
    try {
      const { protocol, hostname } = new URL(origin);
      return (protocol === "http:" || protocol === "https:") && (
        ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
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
  app.use(cors({
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
    allowedHeaders: ["Content-Type", "Authorization", "Traceparent", "X-Trace-Id", "X-Span-Id", "X-Client-Id"],
    exposedHeaders: ["Traceparent", "X-Trace-Id", "X-Span-Id", "X-Client-Id"],
  }));
  app.use("/api/health", require("./routes/healthRoute"));
  app.use("/api/user", require("./routes/userRoute"));
  app.use("/api/inventory", require("./routes/inventoryRoute"));
  app.use("/api/bill", require("./routes/billingRoute"));
  app.use("/api/customer", require("./routes/customerRoute"));
  app.use("/api/analytics", require("./routes/analyticsRoute"));
  app.get("/", (req, res) => res.send("Hello from the server!"));
  app.use(errorHandler);
  return app;
};

module.exports = createApp;
