const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const DUMMY_USERS = [
  {
    id: "u1",
    name: "prem lal",
    email: "uscharger@gmail.com",
    password: "carpediem",
  },
];

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "something went wrong,could not find users",
      500
    );
    return next(error);
  }

  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed,please check your input data", 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("signup failed,please try again later", 500);
    return next(error);
  }

  if (existingUser) {
    return next(
      new HttpError(
        "could not create user,user email already exits, try login instead.",
        422
      )
    );
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create a user", 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Could not signup,try again later", 500);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "1hr" }
    );
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, Please try again later",
      500
    );
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  let identifiedUser;
  try {
    identifiedUser = await User.findOne({ email: email });
    // console.log(identifiedUser);
  } catch (err) {
    const error = new HttpError(
      "Could not find the user,please try sign up insted",
      500
    );
    return next(error);
  }
  // console.log(identifiedUser.password);
  if (!identifiedUser) {
    return next(
      new HttpError("could not identify user,credentials seem to be wrong", 401)
    );
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, identifiedUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, Please try again later",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "could not identify user,credentials seem to be wrong vp",
      401
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        email: identifiedUser.email,
        userId: identifiedUser.id,
      },
      "super-secret-dont-share",
      {
        expiresIn: "1h",
      }
    );
  } catch (err) {
    const error = new HttpError(
      "Could not log you in,Please try again later",
      500
    );
    return next(error);
  }

  res.json({
    userId:identifiedUser.id,email:identifiedUser.email,token:token
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
