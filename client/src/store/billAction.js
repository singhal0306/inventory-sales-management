import axios from "axios";
import { billAction } from "./billSlice";

export const getBills = () => {
  return async (dispatch) => {
    dispatch(billAction.getItemsRequest());
    try {
      const response = await axios.get("/api/bill/allbills");
      dispatch(billAction.getItemsSuccess(response.data.bills));
      // console.log(response.data.bills);
    } catch (error) {
      console.log(error.response);
      dispatch(billAction.getItemsFail(error.response));
    }
  };
};
