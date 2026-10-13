const mongoose = require("mongoose");
const User = require("../modals/userModal");

const publicFields = "name email role isActive createdAt updatedAt profilePhoto.contentType";
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "user",
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  hasProfilePhoto: Boolean(user.profilePhoto?.contentType),
});

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select(publicFields).sort({ name: 1 }).lean();
    res.json({ users: users.map(publicUser) });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) throw fail("Invalid user ID.", 400);
    const { name, email, role, isActive } = req.body;
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
      throw fail("Name and email are required.", 400);
    }
    if (!["user", "admin"].includes(role) || typeof isActive !== "boolean") {
      throw fail("Provide a valid role and account status.", 400);
    }
    if (req.user._id.equals(new mongoose.Types.ObjectId(req.params.id)) && (role !== "admin" || !isActive)) {
      throw fail("You cannot remove your own admin access or disable your own account.", 400);
    }
    // Allowlist editable fields; passwords and attribution references are preserved.
    const user = await User.findByIdAndUpdate(req.params.id, {
      $set: { name: name.trim(), email: email.trim(), role, isActive },
    }, { new: true, runValidators: true }).select(publicFields);
    if (!user) throw fail("User not found.", 404);
    req.log?.info({ event: "admin.user.updated", actorId: String(req.user._id), userId: String(user._id) }, "User updated by administrator");
    res.json({ message: "User updated successfully.", user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) error = fail("This email is already used by another account.", 409);
    if (error.name === "ValidationError") error = fail("Provide a valid name, email, role, and account status.", 400);
    next(error);
  }
};

module.exports = { getUsers, updateUser };
