import { configureStore } from "@reduxjs/toolkit";
import registerReducer from "./registerSlice";
import userReducer from "./userSlice";
import inventoryReducer from "./inventorySlice";
import salesReducer from "./salesSlice"
import billsReducer from "./billSlice"
import customersReducer from "./customerSlice";

const store = configureStore({
  reducer: {
    register: registerReducer,
    user: userReducer,
    inventory: inventoryReducer,
    sales: salesReducer,
    bills: billsReducer,
    customers: customersReducer,
  },
});

export default store;
