import { createSlice } from "@reduxjs/toolkit";

const billSlice = createSlice({
  name: "Bill",
  initialState: {
    loading: false,
    bills: [],
    error: false,
  },
  reducers: {
    getItemsRequest(state) {
      state.loading = true;
    },
    getItemsSuccess(state, action) {
      state.loading = false;
      state.bills = action.payload;
      state.error = false;
    },
    getItemsFail(state, action) {
      state.error = true;
      state.loading = false;
    },
  },
});

export const billAction = billSlice.actions;
export default billSlice.reducer;
