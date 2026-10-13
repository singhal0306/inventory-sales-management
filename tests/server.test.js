const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");
const filename = require.resolve("../server");
const source = fs.readFileSync(filename, "utf8");

const loadServer = (t, { main = false, failConnect = false, environment = {} } = {}) => {
  const log = { info: t.mock.fn(), error: t.mock.fn(), fatal: t.mock.fn() };
  const connection = new EventEmitter();
  connection.name = "isolated-test";
  const httpServer = new EventEmitter();
  const connect = t.mock.fn(async () => {
    if (failConnect) throw new Error("Connection failed");
    connection.emit("connected");
  });
  const listen = t.mock.fn((port, ready) => { ready(); return httpServer; });
  const configure = t.mock.fn();
  const module = { exports: {} };
  const requireMock = (name) => {
    const dependencies = { dotenv: { config: configure }, mongoose: { connection, connect }, "./utils/logger": log, "./app": () => ({ listen }) };
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  requireMock.main = main ? module : {};
  const processMock = { env: { mongoUrl: "mongodb://never-connected/test", ...environment } };
  vm.runInNewContext(source, { module, require: requireMock, process: processMock }, { filename });
  return { exports: module.exports, log, connection, httpServer, connect, listen, configure, processMock };
};

test("importing server does not load .env, connect to MongoDB or listen", (t) => {
  const fixture = loadServer(t);
  assert.equal(fixture.connect.mock.callCount(), 0);
  assert.equal(fixture.listen.mock.callCount(), 0);
  assert.equal(fixture.configure.mock.callCount(), 0);
});

for (const port of [undefined, "5000"]) test(`startServer waits for MongoDB and listens on ${port || 8000}`, async (t) => {
  const fixture = loadServer(t, { environment: { port } });
  const server = await fixture.exports.startServer();
  assert.equal(server, fixture.httpServer);
  // VM arrays have a different prototype; compare the call's primitive arguments.
  const connectArguments = fixture.connect.mock.calls[0].arguments;
  assert.equal(connectArguments.length, 1);
  assert.equal(connectArguments[0], "mongodb://never-connected/test");
  assert.equal(fixture.listen.mock.calls[0].arguments[0], port || 8000);
  assert.equal(fixture.log.info.mock.calls[0].arguments[0].event, "database.connected");
  fixture.connection.emit("error", new Error("Disconnected"));
  assert.equal(fixture.log.error.mock.calls[0].arguments[0].event, "database.connection.error");
  fixture.httpServer.emit("error", new Error("Address in use"));
  assert.equal(fixture.log.fatal.mock.calls[0].arguments[0].event, "server.listen.failed");
  assert.equal(fixture.processMock.exitCode, 1);
});

test("startServer rejects a connection failure before listening", async (t) => {
  const fixture = loadServer(t, { failConnect: true });
  await assert.rejects(fixture.exports.startServer(), /Connection failed/);
  assert.equal(fixture.listen.mock.callCount(), 0);
});

test("server entry point loads environment and reports asynchronous startup failures", async (t) => {
  const fixture = loadServer(t, { main: true, failConnect: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.configure.mock.callCount(), 1);
  assert.equal(fixture.log.fatal.mock.calls[0].arguments[0].event, "server.start.failed");
  assert.equal(fixture.processMock.exitCode, 1);
  assert.equal(fixture.listen.mock.callCount(), 0);
});

test("server entry point starts normally", async (t) => {
  const fixture = loadServer(t, { main: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fixture.listen.mock.callCount(), 1);
  assert.equal(fixture.processMock.exitCode, undefined);
});
