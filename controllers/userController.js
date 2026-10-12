const User = require("../modals/userModal");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const jwtCookieOptions = () => {
  const sameSite = (process.env.cookieSameSite || "lax").toLowerCase();
  return {
    httpOnly: true,
    secure:
      process.env.nodeEnv === "production" ||
      process.env.NODE_ENV === "production" ||
      sameSite === "none",
    sameSite,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
};

const genToken = (id) => {
  return jwt.sign({ id }, process.env.jwtSecret, { expiresIn: "30d" });
};

const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const name = firstName.toUpperCase() + " " + lastName.toUpperCase();
    if (!name || !email || !password) {
      res.status(400);
      throw new Error("Please provide all the information!");
    }
    if (password.length < 6) {
      res.status(400);
      throw new Error("Minimum password length is 6");
    }
    const userExist = await User.findOne({ email });
    if (userExist) {
      res.status(400);
      throw new Error("User already Exist");
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      const token = genToken(user._id);

      res.cookie("jwt", token, jwtCookieOptions());
      req.log?.info(
        { event: "auth.user.registered", userId: String(user._id) },
        "User registered"
      );
      res.status(200).json({
        message: "User Register Successfully",
      });
    } else {
      res.status(400);
      throw new Error("Something went wrong!");
    }
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide both Email and Password");
    }
    const user = await User.findOne({ email }).select("-profilePhoto.data");
    if (!user) {
      req.log?.warn({ event: "auth.login.failed", reason: "invalid_credentials" }, "Login rejected");
      res.status(400);
      throw new Error("Invalid Credentials");
    }
    const matchPassword = await bcrypt.compare(password, user.password);
    if (user && matchPassword) {
      const token = genToken(user._id);
      res.cookie("jwt", token, jwtCookieOptions());
      req.log?.info(
        { event: "auth.login.succeeded", userId: String(user._id) },
        "Login succeeded"
      );
      res.status(200).json({
        message: "User Logged In Successfully",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          hasProfilePhoto: Boolean(user.profilePhoto?.contentType),
        },
      });
    } else {
      req.log?.warn({ event: "auth.login.failed", reason: "invalid_credentials" }, "Login rejected");
      res.status(400);
      throw new Error("Invalid Credentials");
    }
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || typeof confirmPassword !== "string") {
      res.status(400);
      throw new Error("Provide your current password, new password, and confirmation.");
    }
    if (newPassword.trim().length < 6 || newPassword.length > 23) {
      res.status(400);
      throw new Error("New password must contain 6 to 23 characters.");
    }
    if (newPassword !== confirmPassword) {
      res.status(400);
      throw new Error("New passwords do not match.");
    }
    const user = await User.findById(req.user._id).select("password");
    if (!user) {
      res.status(401);
      throw new Error("User not found. Please sign in again.");
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400);
      throw new Error("Current password is incorrect.");
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      res.status(400);
      throw new Error("Choose a password different from your current password.");
    }
    user.password = newPassword;
    // Validate the plaintext password and let the existing save hook hash it.
    await user.save({ validateModifiedOnly: true });
    req.log?.info({ event: "auth.password.changed", userId: String(user._id) }, "Password changed");
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

const logoutUser = (req, res, next) => {
  res.clearCookie("jwt", jwtCookieOptions());
  req.log?.info({ event: "auth.logout" }, "User logged out");
  res.status(200).json({ message: "User Logged Out Successfully" });
};

const detectProfilePhotoType = (buffer) => {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
};

const getProfilePhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("profilePhoto");
    const photo = user?.profilePhoto;
    if (!photo?.data || !photo.contentType) {
      res.status(404);
      throw new Error("No profile photo has been uploaded");
    }

    res.set({
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.data.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.status(200).send(photo.data);
  } catch (error) {
    next(error);
  }
};

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error("Choose an image to upload");
    }

    const contentType = detectProfilePhotoType(req.file.buffer);
    if (!contentType || contentType !== req.file.mimetype) {
      res.status(415);
      throw new Error("The uploaded file is not a supported JPEG, PNG, or WebP image");
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { profilePhoto: { data: req.file.buffer, contentType } } }
    );
    req.log?.info(
      { event: "auth.profile_photo.uploaded", userId: String(req.user._id), contentType },
      "Profile photo uploaded"
    );
    res.status(200).json({ message: "Profile photo updated", hasProfilePhoto: true });
  } catch (error) {
    next(error);
  }
};

const deleteProfilePhoto = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { $unset: { profilePhoto: 1 } });
    req.log?.info(
      { event: "auth.profile_photo.removed", userId: String(req.user._id) },
      "Profile photo removed"
    );
    res.status(200).json({ message: "Profile photo removed", hasProfilePhoto: false });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  changePassword,
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  getProfilePhoto,
  uploadProfilePhoto,
  deleteProfilePhoto,
};
