const mongoose = require("mongoose");

const salesDataSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  itemName: { type: String, required: true },
  manufacturer: { type: String, required: true },
  quantity: { type: Number, required: true },
  ppp: { type: Number, required: true },
  price: { type: Number, required: true },
});

const billSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    salesData: { type: [salesDataSchema], required: true },
    subTotal: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const billModal = mongoose.model('bill', billSchema);
module.exports = billModal;

const billData = {
  customerName: "Suryasnh",
  salesData: [
    {
      _id: "661286e4c94920c1f092a417",
      itemName: "Fanta",
      manufacturer: "CocaCola",
      quantity: 1,
      ppp: 40,
      price: 40,
    },
    {
      _id: "6612ff446960dedf3f0199c5",
      itemName: "teda-meda",
      manufacturer: "Bingo",
      quantity: 1,
      ppp: 20,
      price: 20,
    },
    {
      _id: "6612ff736960dedf3f0199d2",
      itemName: "Lays",
      manufacturer: "Bingo",
      quantity: 1,
      ppp: 20,
      price: 20,
    },
  ],
  subTotal: 80,
};
