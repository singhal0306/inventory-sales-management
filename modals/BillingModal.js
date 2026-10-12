const mongoose = require("mongoose");

const salesDataSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, required: true, min: 1 },
    ppp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    salesData: { type: [salesDataSchema], required: true },
    subTotal: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const billModal = mongoose.model('bill', billSchema);
module.exports = billModal;
