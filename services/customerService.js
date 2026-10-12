const mongoose = require("mongoose");
const Customer = require("../modals/CustomerModal");

const normalizeCustomerName = (name) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeEmail = (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  return normalized || undefined;
};

const normalizePhone = (phone) => {
  const normalized = String(phone || "").trim().replace(/[\s().-]/g, "");
  return normalized || undefined;
};

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const resolveCustomer = async ({ customerId, customerName, companyName, email, phone, actorId }) => {
  const displayName = String(customerName || "").trim().replace(/\s+/g, " ");
  const normalizedName = normalizeCustomerName(displayName);
  if (!normalizedName) {
    throw createError("Customer name is required", 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const normalizedCompanyName = String(companyName || "").trim().replace(/\s+/g, " ") || undefined;
  let customer;

  if (customerId) {
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      throw createError("Invalid customer ID", 400);
    }
    customer = await Customer.findById(customerId);
    if (!customer) {
      throw createError("Customer not found", 404);
    }
    if (customer.normalizedName !== normalizedName) {
      throw createError("Customer selection changed. Select the customer again.", 409);
    }
  } else {
    customer = await Customer.findOne({ normalizedName });
  }

  if (customer && customer.isActive === false) {
    throw createError("This customer is archived. Restore the customer before using it in a new bill.", 409);
  }

  if (!customer) {
    customer = new Customer({
      customerName: displayName,
      normalizedName,
      companyName: normalizedCompanyName,
      email: normalizedEmail,
      phone: normalizedPhone,
      createdBy: actorId,
    });
  } else {
    if (normalizedEmail && customer.email && customer.email !== normalizedEmail) {
      throw createError("This customer name is already linked to a different email", 409);
    }
    if (normalizedPhone && customer.phone && customer.phone !== normalizedPhone) {
      throw createError("This customer name is already linked to a different phone number", 409);
    }
    if (
      normalizedCompanyName &&
      customer.companyName &&
      customer.companyName.toLowerCase() !== normalizedCompanyName.toLowerCase()
    ) {
      throw createError("This customer already has a different company name", 409);
    }
    let profileUpdated = false;
    if (normalizedEmail && !customer.email) {
      customer.email = normalizedEmail;
      profileUpdated = true;
    }
    if (normalizedPhone && !customer.phone) {
      customer.phone = normalizedPhone;
      profileUpdated = true;
    }
    if (normalizedCompanyName && !customer.companyName) {
      customer.companyName = normalizedCompanyName;
      profileUpdated = true;
    }
    if (profileUpdated) customer.updatedBy = actorId;
  }

  try {
    await customer.save();
  } catch (error) {
    if (error.code === 11000) {
      throw createError("A customer with this name, email, or phone number already exists", 409);
    }
    throw error;
  }

  return customer;
};

module.exports = {
  normalizeCustomerName,
  normalizeEmail,
  normalizePhone,
  resolveCustomer,
};
