// CRA's Jest 27 runner needs Axios's CommonJS browser build.
import axios from "axios/dist/browser/axios.cjs";
import { createRequestContextInterceptor } from "./requestContext";

const makeBrowser = () => {
  let sequence = 0;
  return {
    // Deliberately omit randomUUID, as browsers do for HTTP LAN origins.
    crypto: {
      getRandomValues: jest.fn((bytes) => {
        bytes.fill(++sequence);
        return bytes;
      }),
    },
    sessionStorage: {
      getItem: jest.fn(() => null),
      setItem: jest.fn(),
    },
  };
};

const makeClient = (browser) => {
  const adapter = jest.fn(async (config) => ({
    config,
    data: { message: "OK" },
    status: 200,
    statusText: "OK",
    headers: {},
  }));
  const client = axios.create({ adapter, withCredentials: true });
  client.interceptors.request.use(createRequestContextInterceptor(browser));
  return { client, adapter };
};

test("login reaches the Axios adapter on HTTP without crypto.randomUUID", async () => {
  const browser = makeBrowser();
  const { client, adapter } = makeClient(browser);

  const response = await client.post("/api/user/login", {
    email: "user@example.com",
    password: "test-password",
  });

  expect(adapter).toHaveBeenCalledTimes(1);
  expect(response.status).toBe(200);
  expect(response.config.withCredentials).toBe(true);
  const headers = response.config.headers;
  const traceId = headers.get("X-Trace-Id");
  const spanId = headers.get("X-Span-Id");
  expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  expect(headers.get("traceparent")).toBe(`00-${traceId}-${spanId}-01`);
  expect(headers.get("X-Client-Id")).toMatch(/^[0-9a-f]{32}$/);
  expect(browser.sessionStorage.setItem).toHaveBeenCalledWith(
    "inventory-client-id",
    headers.get("X-Client-Id")
  );
});

test("reuses the saved client ID while generating new traces per request", async () => {
  const browser = makeBrowser();
  browser.sessionStorage.getItem.mockReturnValue("existing-client-id");
  const { client } = makeClient(browser);

  const first = await client.get("/api/user/getuser");
  const second = await client.get("/api/inventory");

  expect(first.config.headers.get("X-Client-Id")).toBe("existing-client-id");
  expect(second.config.headers.get("X-Client-Id")).toBe("existing-client-id");
  expect(first.config.headers.get("X-Trace-Id")).not.toBe(
    second.config.headers.get("X-Trace-Id")
  );
  expect(browser.sessionStorage.setItem).not.toHaveBeenCalled();
});

test("blocked session storage does not block requests or change the in-memory client ID", async () => {
  const browser = makeBrowser();
  Object.defineProperty(browser, "sessionStorage", {
    get() {
      throw new Error("Storage access denied");
    },
  });
  const { client, adapter } = makeClient(browser);

  const first = await client.post("/api/user/login", {});
  const second = await client.get("/api/user/getuser");

  expect(adapter).toHaveBeenCalledTimes(2);
  expect(first.config.headers.get("X-Client-Id")).toMatch(/^[0-9a-f]{32}$/);
  expect(second.config.headers.get("X-Client-Id")).toBe(
    first.config.headers.get("X-Client-Id")
  );
});

test.each([
  {},
  {
    crypto: {
      getRandomValues() {
        throw new Error("Crypto unavailable");
      },
    },
  },
])("unavailable tracing APIs still allow API requests", async (browser) => {
  const { client, adapter } = makeClient(browser);

  const response = await client.post("/api/user/login", {});

  expect(adapter).toHaveBeenCalledTimes(1);
  expect(response.status).toBe(200);
  expect(response.config.headers.get("traceparent")).toBeUndefined();
});
