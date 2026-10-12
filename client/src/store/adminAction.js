import axios from "axios";
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
