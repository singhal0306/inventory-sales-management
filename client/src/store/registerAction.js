import { registerAction } from "./registerSlice";
import axios from "axios";

export const userRegistration = (user) => {
  return async (dispatch) => {
    dispatch(registerAction.userRegisterRequest());
    try {
      const response = await axios.post("/api/user/register", user);
      dispatch(registerAction.userRegisterSuccess(response.data.message));
    } catch (error) {
      dispatch(registerAction.userRegisterFails(error.response?.data?.message || "Unable to create account. Please try again."));
    }
  };
};
