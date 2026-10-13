import { createSlice } from "@reduxjs/toolkit";

const initialState = { users: [], photos: {}, loading: false, saving: false, loaded: false, error: null, message: null };

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    fetchUsersRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchUsersSuccess(state, action) {
      state.users = action.payload;
      state.photos = {};
      state.loading = false;
      state.loaded = true;
    },
    fetchUsersFail(state, action) {
      state.loading = false;
      state.loaded = false;
      state.error = action.payload;
    },
    photoRequest(state, action) {
      const { id, requestId } = action.payload;
      state.photos[id] = { requestId, status: "loading", url: null };
    },
    photoSuccess(state, action) {
      const { id, requestId, url } = action.payload;
      if (state.photos[id]?.requestId !== requestId) return;
      state.photos[id] = { requestId, status: "loaded", url };
    },
    photoFail(state, action) {
      const { id, requestId } = action.payload;
      if (state.photos[id]?.requestId !== requestId) return;
      state.photos[id] = { requestId, status: "failed", url: null };
    },
    updateUserRequest(state) {
      state.saving = true;
      state.error = null;
      state.message = null;
    },
    updateUserSuccess(state, action) {
      const { user, message } = action.payload;
      const index = state.users.findIndex((entry) => entry._id === user._id);
      if (index !== -1) state.users[index] = user;
      state.users.sort((left, right) => left.name.localeCompare(right.name));
      state.saving = false;
      state.message = message;
    },
    updateUserFail(state, action) {
      state.saving = false;
      state.error = action.payload;
    },
    clearFeedback(state) {
      state.error = null;
      state.message = null;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher((action) =>
      ["user/logoutSuccess", "user/sessionMissing", "user/loginFails"].includes(action.type) ||
      (action.type === "user/userInfo" && action.payload?.role !== "admin") ||
      (action.type === "user/loginSuccess" && action.payload?.user?.role !== "admin"),
    () => initialState);
  },
});

export const adminActions = adminSlice.actions;
export default adminSlice.reducer;
