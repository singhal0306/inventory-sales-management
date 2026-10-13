// A private-network HTTP origin cannot use crypto.randomUUID().
// getRandomValues() works on HTTP as well as HTTPS.
export const createRequestContextInterceptor = (browser = window) => {
  const storageKey = "inventory-client-id";
  let clientId;

  const randomHex = (byteLength) => {
    const bytes = new Uint8Array(byteLength);
    browser.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const getClientId = () => {
    if (clientId) return clientId;
    try {
      clientId = browser.sessionStorage.getItem(storageKey);
    } catch {
      // Storage can be blocked by browser privacy settings.
    }
    if (clientId) return clientId;

    clientId = randomHex(16);
    try {
      browser.sessionStorage.setItem(storageKey, clientId);
    } catch {
      // Retain the ID in memory when session storage is unavailable.
    }
    return clientId;
  };

  return (config) => {
    try {
      const traceId = randomHex(16);
      const spanId = randomHex(8);
      const contextHeaders = {
        traceparent: `00-${traceId}-${spanId}-01`,
        "X-Trace-Id": traceId,
        "X-Span-Id": spanId,
        "X-Client-Id": getClientId(),
      };

      if (typeof config.headers?.set === "function") {
        Object.entries(contextHeaders).forEach(([name, value]) => {
          config.headers.set(name, value);
        });
      } else {
        config.headers = { ...config.headers, ...contextHeaders };
      }
    } catch {
      // Tracing is optional. The backend generates context when none is sent.
    }
    return config;
  };
};
