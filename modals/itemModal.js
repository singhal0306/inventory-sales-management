const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    movementType: {
      type: String,
      enum: ["initial", "restock"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    createdAt: { type: Date, default: Date.now },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    manufacturer: { type: String, default: "Rajwada", trim: true },
    normalizedItemName: { type: String, trim: true },
    normalizedManufacturer: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    ppp: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    archivedAt: { type: Date },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    stockMovements: { type: [stockMovementSchema], default: [] },
  },
  { timestamps: true }
);

itemSchema.index(
  { normalizedItemName: 1, normalizedManufacturer: 1 },
  {
    unique: true,
    partialFilterExpression: {
      normalizedItemName: { $type: "string" },
      normalizedManufacturer: { $type: "string" },
    },
  }
);

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
