import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import store from "./store/store";
import { Provider } from "react-redux";
import axios from "axios";

axios.defaults.withCredentials = true;

const randomHex = (byteLength) => {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getClientId = () => {
  const storageKey = "inventory-client-id";
  try {
    const existingId = window.sessionStorage.getItem(storageKey);
    if (existingId) return existingId;
    const clientId = window.crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, clientId);
    return clientId;
  } catch {
    return window.crypto.randomUUID();
  }
};

axios.interceptors.request.use((config) => {
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  const headers = config.headers;
  headers.set("traceparent", `00-${traceId}-${spanId}-01`);
  headers.set("X-Trace-Id", traceId);
  headers.set("X-Span-Id", spanId);
  headers.set("X-Client-Id", getClientId());
  return config;
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
