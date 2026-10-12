import { userAction } from "./userSlice";
import axios from "axios";

export const userLogin = (user) => {
  return async (dispatch) => {
    dispatch(userAction.loginRequest());
    try {
      const response = await axios.post("/api/user/login", user);
      dispatch(userAction.loginSuccess(response.data));
    } catch (error) {
      dispatch(userAction.loginFails(error.response?.data?.message || "Unable to sign in"));
    }
  };
};

export const getUser = () => {
  return async (dispatch) => {
    dispatch(userAction.loginRequest());
    try {
      const response = await axios.get("/api/user/getuser");
      dispatch(userAction.userInfo(response.data));
    } catch (error) {
      if (error.response?.status === 401) {
        dispatch(userAction.sessionMissing());
      } else {
        dispatch(userAction.loginFails(error.response?.data?.message || "Session could not be verified"));
      }
    }
  };
};

export const userLogout = () => {
  return async (dispatch, getState) => {
    try {
      await axios.post("/api/user/logout");
      const photoUrl = getState().user.profilePhotoUrl;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      dispatch(userAction.logoutSuccess());
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not log out. Please try again.");
    }
  };
};

export const changePassword = (passwords) => async () => {
  try {
    const response = await axios.patch("/api/user/password", passwords);
    return response.data.message;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Password could not be updated. Please try again.");
  }
};

const errorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const fetchProfilePhoto = (force = false) => {
  return async (dispatch, getState) => {
    const userState = getState().user;
    if (!userState.user.hasProfilePhoto) {
      dispatch(userAction.profilePhotoMissing());
      return;
    }
    if (userState.profilePhotoLoading || (!force && userState.profilePhotoLoaded)) return;

    dispatch(userAction.profilePhotoRequest());
    try {
      const response = await axios.get("/api/user/profile-photo", { responseType: "blob" });
      const nextUrl = URL.createObjectURL(response.data);
      const previousUrl = getState().user.profilePhotoUrl;
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      dispatch(userAction.profilePhotoLoaded(nextUrl));
    } catch (error) {
      if (error.response?.status === 404) {
        dispatch(userAction.profilePhotoMissing());
        return;
      }
      dispatch(userAction.profilePhotoFailed(errorMessage(error, "Profile photo could not be loaded")));
    }
  };
};

export const uploadProfilePhoto = (file) => {
  return async (dispatch, getState) => {
    dispatch(userAction.profilePhotoSaveRequest());
    try {
      const formData = new FormData();
      formData.append("photo", file);
      await axios.post("/api/user/profile-photo", formData);
      const previousUrl = getState().user.profilePhotoUrl;
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      dispatch(userAction.profilePhotoSaveSuccess());
      await dispatch(fetchProfilePhoto(true));
    } catch (error) {
      const message = errorMessage(error, "Profile photo could not be uploaded");
      dispatch(userAction.profilePhotoSaveFailed(message));
      throw new Error(message);
    }
  };
};

export const removeProfilePhoto = () => {
  return async (dispatch, getState) => {
    dispatch(userAction.profilePhotoSaveRequest());
    try {
      await axios.delete("/api/user/profile-photo");
      const previousUrl = getState().user.profilePhotoUrl;
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      dispatch(userAction.profilePhotoRemoved());
    } catch (error) {
      const message = errorMessage(error, "Profile photo could not be removed");
      dispatch(userAction.profilePhotoSaveFailed(message));
      throw new Error(message);
    }
  };
};
