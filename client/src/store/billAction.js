import axios from "axios";
import { billAction } from "./billSlice";

export const getBills = () => {
  return async (dispatch) => {
    dispatch(billAction.getItemsRequest());
    try {
      const response = await axios.get("/api/bill/allbills");
      dispatch(billAction.getItemsSuccess(response.data.bills));
    } catch (error) {
      dispatch(
        billAction.getItemsFail(
          error.response?.data?.message || "Bills could not be loaded"
        )
      );
    }
  };
};
