import { createSlice } from "@reduxjs/toolkit";

const salesSlice = createSlice({
  name: "sales",
  initialState: {
    customer: "",
    salesItems: [],
    total: 0,
    CGST: 0,
    IGST: 0,
    subtotal: 0,
    changed: false,
  },
  reducers: {
    resetSalesData(state) {
      state.salesItems = [];
      state.customer = "";
      state.total = 0;
      state.CGST = 0;
      state.IGST = 0;
      state.subtotal = 0;
      state.changed = true;
    },
    setName(state, action) {
      state.customer = action.payload;
    },
    addToSales(state, action) {
      const newItem = action.payload.item;
      const quantity = action.payload.quantity;
      // state.changed = true;
      const existingItem = state.salesItems.find(
        (item) => item._id === newItem._id
      );
      if (!existingItem) {
        const item = {
          _id: newItem._id,
          itemName: newItem.itemName,
          manufacturer: newItem.manufacturer,
          quantity: quantity,
          ppp: newItem.ppp,
          price: newItem.ppp * quantity,
        };
        state.total = +state.total + +item.price;
        state.CGST = (+state.total * 2.5) / 100;
        state.IGST = +state.CGST;
        state.subtotal = +state.total + +state.IGST + +state.CGST;
        state.salesItems.push(item);
        // itemName: "Fanta"
        // manufacturer: "CocaCola"
        // ppp: 40
        // quantity: 100
        // __v: 0
        // _id: "661286e4c94920c1f092"
      } else {
        existingItem.quantity = +existingItem.quantity + +quantity;
        existingItem.price = existingItem.ppp * existingItem.quantity;
        state.total = state.total + +existingItem.ppp * +quantity;
        state.CGST = (+state.total * 2.5) / 100;
        state.IGST = +state.CGST;
        state.subtotal = +state.total + +state.IGST + +state.CGST;
      }
    },
    removeFromSales(state, action) {
      // state.changed = true;
      const salesItems = state.salesItems.filter((item) => {
        return item._id !== action.payload._id;
      });
      state.salesItems = salesItems;
      state.total = +state.total - +action.payload.price;
      state.CGST = (+state.total * 2.5) / 100;
      state.IGST = +state.CGST;
      state.subtotal = +state.total + +state.IGST + +state.CGST;
    },
  },
});

export const salesActions = salesSlice.actions;
export default salesSlice.reducer;
