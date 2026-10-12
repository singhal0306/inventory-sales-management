const { randomBytes, randomUUID } = require("crypto");
const logger = require("../utils/logger");

const traceIdPattern = /^[0-9a-f]{32}$/i;
const spanIdPattern = /^[0-9a-f]{16}$/i;
const clientIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const traceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const zeroTraceId = "00000000000000000000000000000000";
const zeroSpanId = "0000000000000000";

const makeId = (bytes) => randomBytes(bytes).toString("hex");

const normalizeTraceId = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/-/g, "").toLowerCase();
  return traceIdPattern.test(normalized) && normalized !== zeroTraceId
    ? normalized
    : null;
};

const normalizeSpanId = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/-/g, "").toLowerCase();
  return spanIdPattern.test(normalized) && normalized !== zeroSpanId
    ? normalized
    : null;
};

const requestContext = (req, res, next) => {
  const incomingTraceparent = traceparentPattern.exec(req.get("traceparent") || "");
  const traceId =
    normalizeTraceId(incomingTraceparent?.[1]) ||
    normalizeTraceId(req.get("x-trace-id")) ||
    makeId(16);
  const parentSpanId =
    normalizeSpanId(incomingTraceparent?.[2]) ||
    normalizeSpanId(req.get("x-span-id")) ||
    undefined;
  const traceFlags = incomingTraceparent?.[3]?.toLowerCase() || "01";
  const spanId = makeId(8);
  const requestedClientId = req.get("x-client-id");
  const clientId =
    requestedClientId && clientIdPattern.test(requestedClientId)
      ? requestedClientId
      : randomUUID();

  req.context = { traceId, spanId, parentSpanId, clientId };
  req.log = logger.child(req.context);

  res.setHeader("X-Trace-Id", traceId);
  res.setHeader("X-Span-Id", spanId);
  res.setHeader("X-Client-Id", clientId);
  res.setHeader("traceparent", `00-${traceId}-${spanId}-${traceFlags}`);

  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const fields = {
      event: "http.request.completed",
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      remoteAddress: req.ip,
      userId: req.user?._id ? String(req.user._id) : undefined,
    };
    const message = `${req.method} ${fields.path} ${res.statusCode}`;

    if (res.statusCode >= 500) req.log.error(fields, message);
    else if (res.statusCode >= 400) req.log.warn(fields, message);
    else req.log.info(fields, message);
  });

  next();
};

module.exports = requestContext;
