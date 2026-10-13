const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const User = require("../modals/userModal");
const Item = require("../modals/itemModal");
const Customer = require("../modals/CustomerModal");
const Bill = require("../modals/BillingModal");
const createApp = require("../app");

const ids = Object.fromEntries(["actor", "other", "item", "customer", "bill"].map((name, index) =>
  [name, new mongoose.Types.ObjectId(`60000000000000000000000${index + 1}`)]));
const actor = { _id: ids.actor, name: "Test User", email: "test@example.com", role: "user", isActive: true };
const query = (value) => {
  const promise = Promise.resolve().then(() => typeof value === "function" ? value() : value);
  const result = { calls: [], then: promise.then.bind(promise), catch: promise.catch.bind(promise) };
  for (const method of ["select", "sort", "populate", "lean", "allowDiskUse", "exec"]) result[method] = (...args) => {
    result.calls.push({ method, args });
    return result;
  };
  return result;
};
const stub = (t, model, method, value) => {
  const queries = [];
  const mocked = t.mock.method(model, method, (...args) => {
    const result = query(() => typeof value === "function" ? value(...args) : value);
    queries.push(result);
    return result;
  });
  return { mock: mocked.mock, queries };
};
const reject = (t, model, method, error = new Error("Database unavailable")) =>
  stub(t, model, method, () => { throw error; });
const document = (data) => {
  const value = { ...data };
  for (const method of ["save", "populate", "deleteOne"]) {
    Object.defineProperty(value, method, { value: async () => value, configurable: true });
  }
  return value;
};
const env = (t, values) => {
  const old = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
};

async function api(t, { user = actor, environment = {} } = {}) {
  env(t, { NODE_ENV: "test", nodeEnv: "test", jwtSecret: "isolated-backend-test-secret", LOG_LEVEL: "silent", ...environment });
  t.mock.method(logger, "child", () => ({ info() {}, warn() {}, error() {}, fatal() {} }));
  // Fail unconfigured database access immediately; never connect to a real database.
  for (const model of [User, Item, Customer, Bill]) {
    for (const method of ["find", "findOne", "findById", "findByIdAndUpdate", "findOneAndUpdate", "create", "updateOne", "exists", "aggregate"]) {
      reject(t, model, method, new Error(`Unexpected ${model.modelName}.${method}`));
    }
    for (const method of ["save", "deleteOne", "populate"]) t.mock.method(model.prototype, method, async function () {
      throw new Error(`Unexpected ${model.modelName} document.${method}`);
    });
  }
  stub(t, User, "findById", user);
  const server = await new Promise((resolve, rejectListen) => {
    const listening = createApp().listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", rejectListen);
  });
  t.after(() => new Promise((resolve, rejectClose) => server.close((error) => error ? rejectClose(error) : resolve())));
  const token = jwt.sign({ id: String(ids.actor) }, process.env.jwtSecret, { expiresIn: "1h" });
  return async (method, path, body, options = {}) => {
    const headers = { ...(options.auth === false ? {} : { Cookie: `jwt=${token}` }), ...options.headers };
    let payload;
    if (body !== undefined) {
      payload = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
      headers["Content-Length"] = payload.length;
    }
    return new Promise((resolve, rejectRequest) => {
      const req = http.request({ hostname: "127.0.0.1", port: server.address().port, method, path, headers }, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("error", rejectRequest);
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString();
          try {
            const json = buffer.length && res.headers["content-type"]?.includes("application/json") ? JSON.parse(text) : undefined;
            resolve({ status: res.statusCode, headers: res.headers, body: json, text, buffer });
          } catch (error) { rejectRequest(error); }
        });
      });
      req.on("error", rejectRequest);
      req.setTimeout(5000, () => req.destroy(new Error(`Request timed out: ${method} ${path}`)));
      req.end(payload);
    });
  };
}

const expectError = (response, status, message) => {
  assert.equal(response.status, status, response.text);
  assert.match(response.body.message, message);
};
const multipart = (parts) => {
  const boundary = "stockroom-test-boundary";
  const chunks = [];
  for (const { name = "photo", filename = "photo.png", type = "image/png", data } of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`), data, Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { body: Buffer.concat(chunks), headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` } };
};
const invoke = async (handler, input = {}) => {
  const req = { body: {}, query: {}, params: {}, user: actor, ...input };
  const res = { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; },
    set(name, value) { if (typeof name === "object") Object.assign(this.headers, name); else this.headers[name] = value; return this; },
    cookie() {}, clearCookie() {} };
  let error;
  await handler(req, res, (value) => { error = value; });
  return { req, res, error };
};

module.exports = { api, ids, actor, query, stub, reject, document, env, expectError, multipart, invoke, User, Item, Customer, Bill };
