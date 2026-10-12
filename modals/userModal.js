const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const profilePhotoSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: {
      type: String,
      enum: ["image/jpeg", "image/png", "image/webp"],
      required: true,
    },
  },
  { _id: false }
);

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: [true, "Please add a Name"] },
    email: {
      type: String,
      required: [true, "Please add an Email"],
      unique: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please Enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minLength: [6, "Password must be up to 6 charcters"],
      maxLength: [23, "Password is too Long"],
    },
    profilePhoto: { type: profilePhotoSchema, default: undefined },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(this.password, salt);
  this.password = hashedPassword;
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
