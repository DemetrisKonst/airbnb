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
    if (!place) throw new ErrorMid(404, 'Place does not exist');

    req.body.user = req.user._id;
    req.body.place = req.params.id;

    const review = new Review(req.body);
    await review.save();

    place.reviews.push(review);
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

    await Review.findOneAndUpdate({_id: req.params.id, user: req.user._id}, req.body);

    res.status(200).send({success: true})
  }catch (error){
    next(error);
  }
});

router.delete('/review/:id', auth, async (req, res, next) => {
  try{
    const review = await Review.findOneAndDelete({_id: req.params.id, user: req.user._id});
    
    const place = await Place.findById(review.place);
    place.reviews.pull(review._id);
    await place.save();

    res.status(200).send({success: true})
  }catch (error){
    next(error);
  }
});

module.exports = router;