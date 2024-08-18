import { registerAction } from "./registerSlice";
import axios from "axios";

export const userRegistration = (user) => {
  return async (dispatch) => {
    dispatch(registerAction.userRegisterRequest());
    try {
      const response = await axios.post("/api/user/register", user);
      dispatch(registerAction.userRegisterSuccess(response.data.message));
    } catch (error) {
      // console.log(error.response.data.message);
      dispatch(registerAction.userRegisterFails(error.response.data.message));
    }
  };
};
