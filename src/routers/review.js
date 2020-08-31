const express = require('express');
const mongoose = require('mongoose');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const Place = require('../models/place.js');
const Review = require('../models/review.js');

const router = express.Router();

router.post('/place/:id/review', auth, async (req, res, next) => {
  try{
    const place = await Place.findById(req.params.id);
    if (!place)
      throw new ErrorMid(404, 'Place does not exist');

    if (place.owner === req.user._id)
      throw new ErrorMid(400, 'You cannot review your own place');

    req.body.user = req.user._id;
    req.body.place = req.params.id;

    const review = new Review(req.body);
    await review.save();

    place.reviews.review_ids.push(review);
    await place.calculateReviews();
    place.markModified('reviews');
    await place.save();

    res.status(201).send({success: true, data: review});
  }catch (error){
    next(error);
  }
});

router.patch('/review/:id', auth, async (req, res, next) => {
  try{
    const reviewUpdates = Object.keys(req.body);
    const allowedUpdates = ['text', 'rating'];

    for (const update of reviewUpdates) {
      if (!allowedUpdates.includes(update)) throw new ErrorMid(422, 'Cannot update field ' + update);
    }

    const review = await Review.findOneAndUpdate({_id: req.params.id, user: req.user._id}, req.body);
    
    if (!review)
      throw new ErrorMid(404, 'Review does not exist');

    const place = await Place.findById(review.place);
    await place.calculateReviews();
    console.log(place.reviews);
    place.markModified('reviews');
    console.log(place.reviews);
    await place.save();

    res.status(200).send({success: true, data: req.body});
  }catch (error){
    next(error);
  }
});

router.delete('/review/:id', auth, async (req, res, next) => {
  try{
    const review = await Review.findOneAndDelete({_id: req.params.id, user: req.user._id});

    if (!review)
      throw new ErrorMid(404, 'Review does not exist');
    
    const place = await Place.findById(review.place);
    place.reviews.review_ids.pull(review._id);
    await place.calculateReviews();
    place.markModified('reviews');
    await place.save();

    res.status(200).send({success: true})
  }catch (error){
    next(error);
  }
});

module.exports = router;