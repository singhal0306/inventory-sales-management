import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    loading: false,
    authChecked: false,
    loginSuccess: false,
    loginFails: false,
    success: null,
    error: null,
    user: {},
    profilePhotoUrl: null,
    profilePhotoLoaded: false,
    profilePhotoLoading: false,
    profilePhotoSaving: false,
    profilePhotoError: null,
  },
  reducers: {
    sessionMissing(state) {
      state.loading = false;
      state.authChecked = true;
      state.loginSuccess = false;
      state.loginFails = false;
      state.success = null;
      state.error = null;
      state.user = {};
    },
    loginRequest(state) {
      state.loading = true;
      state.loginFails = false;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.authChecked = true;
      state.loginSuccess = true;
      state.loginFails = false;
      state.success = action.payload.message;
      state.user = action.payload.user;
    },
    loginFails(state, action) {
      state.loading = false;
      state.authChecked = true;
      state.loginSuccess = false;
      state.loginFails = true;
      state.error = action.payload;
      state.user = {};
    },
    userInfo(state, action) {
      state.loading = false;
      state.authChecked = true;
      state.loginSuccess = true;
      state.loginFails = false;
      state.error = null;
      state.user = action.payload;
    },
    logoutSuccess(state) {
      state.loading = false;
      state.authChecked = true;
      state.loginSuccess = false;
      state.loginFails = false;
      state.success = null;
      state.error = null;
      state.user = {};
      state.profilePhotoUrl = null;
      state.profilePhotoLoaded = false;
      state.profilePhotoLoading = false;
      state.profilePhotoSaving = false;
      state.profilePhotoError = null;
    },
    profilePhotoRequest(state) {
      state.profilePhotoLoading = true;
      state.profilePhotoError = null;
    },
    profilePhotoLoaded(state, action) {
      state.profilePhotoUrl = action.payload;
      state.profilePhotoLoading = false;
      state.profilePhotoLoaded = true;
      state.profilePhotoError = null;
      state.user.hasProfilePhoto = true;
    },
    profilePhotoMissing(state) {
      state.profilePhotoUrl = null;
      state.profilePhotoLoading = false;
      state.profilePhotoLoaded = true;
      state.profilePhotoError = null;
      state.user.hasProfilePhoto = false;
    },
    profilePhotoFailed(state, action) {
      state.profilePhotoLoading = false;
      state.profilePhotoError = action.payload;
    },
    profilePhotoSaveRequest(state) {
      state.profilePhotoSaving = true;
      state.profilePhotoError = null;
    },
    profilePhotoSaveSuccess(state) {
      state.profilePhotoSaving = false;
      state.profilePhotoLoaded = false;
      state.profilePhotoError = null;
      state.user.hasProfilePhoto = true;
    },
    profilePhotoSaveFailed(state, action) {
      state.profilePhotoSaving = false;
      state.profilePhotoError = action.payload;
    },
    profilePhotoRemoved(state) {
      state.profilePhotoUrl = null;
      state.profilePhotoLoading = false;
      state.profilePhotoSaving = false;
      state.profilePhotoLoaded = true;
      state.profilePhotoError = null;
      state.user.hasProfilePhoto = false;
    },
  },
});

export const userAction = userSlice.actions;
export default userSlice.reducer;
