import axios from "axios";
import { inventoryAction } from "./inventorySlice";

export const getItems = () => {
  return async (dispatch) => {
    dispatch(inventoryAction.getItemsRequest());
    try {
      const response = await axios.get("/api/inventory/getitems");
      dispatch(inventoryAction.getItemsSuccess(response.data.items));
      //   console.log(response.data.items);
    } catch (error) {
      // console.log(error.response.data.message);
      dispatch(inventoryAction.getItemsFail(error.response.data.message));
    }
  };
};

export const addItem = (product) => {
  return async (dispatch) => {
    try {
      const result = await axios.post("/api/inventory/addtoinventory", product);
      dispatch(getItems());
      alert(result.data.message);
    } catch (error) {
      console.log(error);
    }
  };
};

export const deleteItem = (id, itemName) =>{
  return async (dispatch) =>{
    try {
      const result = await axios.get(`/api/inventory/delete/${id}`)
      dispatch(getItems());
      alert(itemName + ": " +result.data.message );
    } catch (error) {
      console.log(error)
    }
  }
}