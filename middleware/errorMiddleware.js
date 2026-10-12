const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const log = req.log || logger;
  const errorFields = {
    event: "http.request.failed",
    statusCode,
    errorType: err.name,
    errorCode: ["string", "number"].includes(typeof err.code) ? err.code : undefined,
  };

  if (statusCode >= 500) {
    log.error(
      {
        ...errorFields,
        stack:
          process.env.nodeEnv === "development" || process.env.NODE_ENV === "development"
            ? err.stack
            : undefined,
      },
      "Request failed"
    );
  } else {
    log.warn(errorFields, "Request rejected");
  }

  res.status(statusCode);
  res.json({
    message: err.message,
    traceId: req.context?.traceId,
    stack:
      process.env.nodeEnv === "development" || process.env.NODE_ENV === "development"
        ? err.stack
        : null,
  });
};

module.exports = errorHandler;
