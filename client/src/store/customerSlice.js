import { createSlice } from "@reduxjs/toolkit";

const customerSlice = createSlice({
  name: "customers",
  initialState: {
    customers: [],
    loading: false,
    error: null,
    loaded: false,
  },
  reducers: {
    fetchCustomersRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchCustomersSuccess(state, action) {
      state.customers = action.payload;
      state.loading = false;
      state.error = null;
      state.loaded = true;
    },
    fetchCustomersFail(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.loaded = false;
    },
    upsertCustomer(state, action) {
      const customer = action.payload;
      const index = state.customers.findIndex((entry) => entry._id === customer._id);
      if (index === -1) state.customers.push(customer);
      else state.customers[index] = customer;
      state.customers.sort((left, right) => left.customerName.localeCompare(right.customerName));
      state.loaded = true;
    },
    archiveCustomer(state, action) {
      const customer = state.customers.find((entry) => entry._id === action.payload);
      if (customer) customer.isActive = false;
    },
    removeCustomer(state, action) {
      state.customers = state.customers.filter((entry) => entry._id !== action.payload);
    },
    restoreCustomer(state, action) {
      const customer = state.customers.find((entry) => entry._id === action.payload);
      if (customer) customer.isActive = true;
    },
  },
});

export const customerActions = customerSlice.actions;
export default customerSlice.reducer;
