const mongoose = require("mongoose");

const itemSchema = {
  itemName: String,
  manufacturer: { type: String, default: "Rajwada" },
  quantity: Number,
  ppp: Number,
};
const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
