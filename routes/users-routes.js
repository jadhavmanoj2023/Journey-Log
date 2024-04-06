const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const HttpError = require("../models/http-error");
const usersControllers = require("../controllers/users-controllers");
const fileUpload = require("../middleware/file-upload");

router.get("/", usersControllers.getUsers);

router.post("/login", usersControllers.login);

router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 5 }),
  ],
  usersControllers.signup
);

module.exports = router;
