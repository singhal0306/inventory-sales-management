import axios from "axios";
import { nanoid } from "@reduxjs/toolkit";
import { analyticsActions } from "./analyticsSlice";

export const fetchSalesReport = (filters) => async (dispatch) => {
  const id = nanoid();
  dispatch(analyticsActions.reportRequest(id));
  try {
    const response = await axios.get("/api/analytics/sales", { params: filters });
    dispatch(analyticsActions.reportSuccess({ id, report: response.data }));
  } catch (error) {
    dispatch(analyticsActions.reportFail({ id, message: error.response?.data?.message || "Sales report could not be loaded." }));
  }
};

export const exportSalesReport = (filters) => async (dispatch, getState) => {
  if (getState().analytics.exporting) return;
  const id = nanoid();
  dispatch(analyticsActions.exportRequest(id));
  try {
    const response = await axios.get("/api/analytics/sales/export", { params: filters, responseType: "blob" });
    if (getState().analytics.exportId !== id) return;
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    dispatch(analyticsActions.exportFinished({ id }));
  } catch (error) {
    let message = "Report could not be exported.";
    if (error.response?.data instanceof Blob) {
      try { message = JSON.parse(await error.response.data.text()).message || message; } catch { /* Keep the fallback for non-JSON responses. */ }
    }
    dispatch(analyticsActions.exportFinished({ id, error: message }));
  }
};
