import axios from "axios";
import { customerActions } from "./customerSlice";

const getMessage = (error, fallback) => error.response?.data?.message || fallback;

export const fetchCustomers = (force = false) => {
  return async (dispatch, getState) => {
    const { loaded, loading } = getState().customers;
    if (!force && (loaded || loading)) return;

    dispatch(customerActions.fetchCustomersRequest());
    try {
      const response = await axios.get("/api/customer?includeArchived=true");
      dispatch(customerActions.fetchCustomersSuccess(response.data.customers || []));
    } catch (error) {
      dispatch(
        customerActions.fetchCustomersFail(
          getMessage(error, "Customers could not be loaded")
        )
      );
    }
  };
};

export const createCustomer = (customerData) => {
  return async (dispatch) => {
    try {
      const response = await axios.post("/api/customer", customerData);
      dispatch(customerActions.upsertCustomer(response.data.customer));
      return response.data.customer;
    } catch (error) {
      throw new Error(getMessage(error, "Customer could not be saved"));
    }
  };
};

export const updateCustomer = (id, customerData) => {
  return async (dispatch) => {
    try {
      const response = await axios.put(`/api/customer/${id}`, customerData);
      dispatch(customerActions.upsertCustomer(response.data.customer));
      return response.data.customer;
    } catch (error) {
      throw new Error(getMessage(error, "Customer could not be saved"));
    }
  };
};

export const archiveCustomer = (customer) => {
  return async (dispatch) => {
    try {
      const response = await axios.delete(`/api/customer/${customer._id}`);
      if (response.data.message.toLowerCase().includes("archived")) {
        dispatch(customerActions.archiveCustomer(customer._id));
      } else {
        dispatch(customerActions.removeCustomer(customer._id));
      }
      return response.data.message;
    } catch (error) {
      throw new Error(getMessage(error, "Customer could not be removed"));
    }
  };
};

export const restoreCustomer = (id) => {
  return async (dispatch) => {
    try {
      const response = await axios.post(`/api/customer/${id}/restore`);
      dispatch(customerActions.upsertCustomer(response.data.customer));
      return response.data.message;
    } catch (error) {
      throw new Error(getMessage(error, "Customer could not be restored"));
    }
  };
};
