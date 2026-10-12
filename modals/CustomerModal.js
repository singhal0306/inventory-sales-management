const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: undefined },
    email: { type: String, trim: true, lowercase: true, default: undefined },
    phone: { type: String, trim: true, default: undefined },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    archivedAt: { type: Date },
    restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
  },
  { timestamps: true }
);

customerSchema.index({ normalizedName: 1 }, { unique: true });
customerSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);
customerSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
);

module.exports = mongoose.model("Customer", customerSchema);
