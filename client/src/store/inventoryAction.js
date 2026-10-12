import axios from "axios";
import { inventoryAction } from "./inventorySlice";

export const getItems = (includeArchived = false) => {
  return async (dispatch) => {
    dispatch(inventoryAction.getItemsRequest());
    try {
      const response = await axios.get(
        `/api/inventory/getitems${includeArchived ? "?includeArchived=true" : ""}`
      );
      dispatch(inventoryAction.getItemsSuccess(response.data.items));
    } catch (error) {
      dispatch(
        inventoryAction.getItemsFail(
          error.response?.data?.message || "Inventory could not be loaded"
        )
      );
    }
  };
};

export const addItem = (product) => {
  return async (dispatch) => {
    try {
      const result = await axios.post("/api/inventory/addtoinventory", product);
      await dispatch(getItems(true));
      alert(result.data.message);
      return result.data.item;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not add this product");
    }
  };
};

export const restockItem = (id, quantity) => {
  return async (dispatch) => {
    try {
      const response = await axios.post(`/api/inventory/addstock/${id}`, { quantity });
      await dispatch(getItems(true));
      return response.data.item;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not record this restock");
    }
  };
};

export const archiveItem = (id) => {
  return async (dispatch) => {
    try {
      const response = await axios.patch(`/api/inventory/archive/${id}`);
      await dispatch(getItems(true));
      return response.data.message;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not archive this item");
    }
  }
};

export const restoreItem = (id) => {
  return async (dispatch) => {
    try {
      const response = await axios.patch(`/api/inventory/restore/${id}`);
      await dispatch(getItems(true));
      return response.data.message;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Could not restore this item");
    }
  };
};