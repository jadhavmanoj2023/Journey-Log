const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const fs = require("fs");

const HttpError = require("../models/http-error");
const Place = require("../models/place");
const User = require("../models/user");

let DUMMY_PLACES = [
  {
    id: "p1",
    title: "Empire state building",
    description: "one of the most famous skyscrapers in world",
    location: {
      lat: 40.7484474,
      lng: -73.9871516,
    },
    address: "20 w ekkado akkada",
    creator: "u1",
  },
];

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Someting went wrong ,could not find place",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "could not find a place for the provided id..",
      404
    );
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) }); //{place} --> place:place
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  // let places;
  let userwithPlaces;
  try {
    userwithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    const error = new HttpError(
      "Fetching places failed,please try again later",
      500
    );
    return next(error);
  }

  //   if (!place) {
  //     return res
  //       .status(404)
  //       .json({ message: "could not find a place for the provided user id." });
  //   }

  //   if (!place) {
  //     const error = new Error("could not find a place for the provided user id");
  //     error.code = 404;
  //     throw error;
  //   }

  // if (!places || places.length === 0) {
  if (!userwithPlaces || userwithPlaces.places.length === 0) {
    return next(
      new HttpError("could not find a place for the provided user id..", 404)
    );
  }

  res.json({
    places: userwithPlaces.places.map((p) => p.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    throw new HttpError("Invalid inputs passed,please check your data", 422);
  }
  const { title, description, coordinates, address } = req.body;
  // const { lat, lng } = req.body.location;
  //const title = req.body.title;
  const createdPlace = new Place({
    title,
    description,
    image: req.file.path,
    address,
    location: { lat: 99775453, lng: 45274589759 },
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Creating place failed,try again later", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }
  console.log(user);

  try {
    // await createdPlace.save();
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace); // adds placeid to user.places
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creation of place failed,Please try again!!!!",
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);
    throw new HttpError("Invalid inputs passed,please check your data", 422);
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not find place to update.",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to Edit this Place.", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    console.log("Attempting to find place with ID:", placeId);
    place = await Place.findById(placeId).populate("creator");
    console.log("Retrieved place:", place);
  } catch (err) {
    console.error("Error while finding place:", err);
    const error = new HttpError(
      "Something went wrong, could not find place to delete.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place to delete", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to Delete this Place.",
      401
    );
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
    console.log("Place deleted successfully");
  } catch (err) {
    console.error("Error while deleting place:", err);
    const error = new HttpError(
      "Something went wrong, could not delete place",
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: `Deleted place with id = ${placeId}` });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
