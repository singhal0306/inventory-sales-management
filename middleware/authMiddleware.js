const User = require("../modals/userModal");
const jwt = require("jsonwebtoken");

const protect = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      res.status(401);
      throw new Error("Not Authorized please login first!");
    }
    const verified = jwt.verify(token, process.env.jwtSecret);
    const user = await User.findById(verified.id).select("-password -profilePhoto.data");
    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }
    if (user.isActive === false) {
      res.status(403);
      throw new Error("Your account is disabled. Contact an administrator.");
    }
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      hasProfilePhoto: Boolean(user.profilePhoto?.contentType),
    };
    next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) {
      error.statusCode = 401;
    }
    next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    const error = new Error("Administrator access is required.");
    error.statusCode = 403;
    return next(error);
  }
  next();
};

module.exports = { protect, requireAdmin };
