import { createSlice } from "@reduxjs/toolkit";

const registerSlice = createSlice({
  name: "userRegistration",
  initialState: {
    loading: false,
    registerSuccess: false,
    registerFails: false,
    success: null,
    error: null,
  },
  reducers: {
    userRegisterRequest(state) {
      state.loading = true;
    },
    userRegisterSuccess(state, action) {
      state.loading = false;
      state.registerSuccess = true;
      state.registerFails = false;
      state.success = action.payload;
    },
    userRegisterFails(state, action) {
      state.loading = false;
      state.registerSuccess = false;
      state.registerFails = true;
      state.error = action.payload;
    },
  },
});

export const registerAction = registerSlice.actions;
export default registerSlice.reducer;
