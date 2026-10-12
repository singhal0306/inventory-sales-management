const multer = require("multer");

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!supportedTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, or WebP image.");
      error.statusCode = 415;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

const parseProfilePhoto = (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      error.statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    }
    next(error);
  });
};

module.exports = parseProfilePhoto;
