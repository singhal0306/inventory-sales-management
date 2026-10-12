import { createSlice } from "@reduxjs/toolkit";

const initialState = { report: null, loading: false, error: null, requestId: null, exporting: false, exportError: null, exportId: null };
const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    reportRequest(state, action) { state.loading = true; state.error = null; state.exportError = null; state.requestId = action.payload; },
    reportSuccess(state, action) {
      if (state.requestId !== action.payload.id) return;
      state.report = action.payload.report; state.loading = false;
    },
    reportFail(state, action) {
      if (state.requestId !== action.payload.id) return;
      state.error = action.payload.message; state.loading = false;
    },
    exportRequest(state, action) { state.exporting = true; state.exportError = null; state.exportId = action.payload; },
    exportFinished(state, action) {
      if (state.exportId !== action.payload.id) return;
      state.exporting = false; state.exportError = action.payload.error || null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher((action) => ["user/logoutSuccess", "user/sessionMissing", "user/loginFails"].includes(action.type), () => initialState);
  },
});

export const analyticsActions = analyticsSlice.actions;
export default analyticsSlice.reducer;
