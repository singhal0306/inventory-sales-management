import axios from "axios";
import { nanoid } from "@reduxjs/toolkit";
import { adminActions } from "./adminSlice";
import { getUser } from "./userAction";

const sameAdmin = (getState, actorId) => {
  const { user } = getState().user;
  return user._id === actorId && user.role === "admin";
};

export const fetchAdminUsers = () => async (dispatch, getState) => {
  const actorId = getState().user.user._id;
  if (!sameAdmin(getState, actorId) || getState().admin.loading) return;
  dispatch(adminActions.fetchUsersRequest());
  try {
    const response = await axios.get("/api/user/admin/users");
    if (sameAdmin(getState, actorId)) dispatch(adminActions.fetchUsersSuccess(response.data.users || []));
  } catch (error) {
    if (!sameAdmin(getState, actorId)) return;
    dispatch(adminActions.fetchUsersFail(error.response?.data?.message || "Users could not be loaded."));
    if ([401, 403].includes(error.response?.status)) await dispatch(getUser());
  }
};

// Data URLs keep image state serializable and are released when the store resets.
const readPhoto = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export const fetchAdminUserPhoto = (id) => async (dispatch, getState) => {
  const actorId = getState().user.user._id;
  const { users, photos } = getState().admin;
  if (!sameAdmin(getState, actorId) || photos[id] || !users.some((user) => user._id === id && user.hasProfilePhoto)) return;

  const requestId = nanoid();
  const isCurrent = () => sameAdmin(getState, actorId) && getState().admin.photos[id]?.requestId === requestId;
  dispatch(adminActions.photoRequest({ id, requestId }));
  try {
    const response = await axios.get(`/api/user/admin/users/${id}/profile-photo`, { responseType: "blob" });
    if (!isCurrent()) return;
    const url = await readPhoto(response.data);
    if (isCurrent()) dispatch(adminActions.photoSuccess({ id, requestId, url }));
  } catch (error) {
    if (!isCurrent()) return;
    dispatch(adminActions.photoFail({ id, requestId }));
    if ([401, 403].includes(error.response?.status)) await dispatch(getUser());
  }
};

export const updateAdminUser = (id, data) => async (dispatch, getState) => {
  const actorId = getState().user.user._id;
  if (!sameAdmin(getState, actorId) || getState().admin.saving) return false;
  dispatch(adminActions.updateUserRequest());
  try {
    const { name, email, role, isActive } = data;
    const response = await axios.patch(`/api/user/admin/users/${id}`, { name, email, role, isActive });
    if (!sameAdmin(getState, actorId)) return false;
    dispatch(adminActions.updateUserSuccess(response.data));
    if (id === actorId) await dispatch(getUser());
    return true;
  } catch (error) {
    if (!sameAdmin(getState, actorId)) return false;
    dispatch(adminActions.updateUserFail(error.response?.data?.message || "User could not be updated."));
    if ([401, 403].includes(error.response?.status)) await dispatch(getUser());
    return false;
  }
};
