const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const Place = require('../models/place.js');
const Booking = require('../models/booking.js');

const router = express.Router();

// router.get('/places', async (req, res, next) => {
//   try{
//     const limit = parseInt(req.query.limit);
//     delete req.query.limit;

//     const skip = parseInt(req.query.skip);
//     delete req.query.skip;

//     const sort = {}

//     if (req.query.sortBy){
//       const parts = req.query.sortBy.split(':');
//       sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
//     }

//     delete req.query.sortBy;

//     const filters = {
//       type: req.query.type,
//       amenities: {
//         wifi: req.query.wifi,
//         airConditioning: req.query.airConditioning,
//         heating: req.query.heating,
//         kitchen: req.query.kitchen,
//         television: req.query.television,
//         parking: req.query.parking,
//         elevator: req.query.elevator
//       }
//     }

//     const user = await User.find({
//       limit,
//       skip,
//       sort
//     });
    
//     const data = {
//       user: await user.view(),
//       token: generateToken(user._id)
//     }
//     res.status(200).send({success: true, data: data});

//   }catch (error){
//     next(error);
//   }
// });

router.get('/place/:id', async (req, res, next) => {
  try{
    const place = await Place.findById(req.params.id)
      .populate('owner', 'firstName lastName')
      .populate({
        path: 'reviews', 
        select: 'user text rating',
        populate: {
          path: 'user',
          select: 'firstName lastName'
        }
      })

    if (!place)
      throw new ErrorMid(404, 'Place does not exist');

    res.send(place);
  }catch (error){
    next(error);
  }
});

router.post('/tenant/place/:id/book', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Tenant' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a tenant');

    const place = await Place.findById(req.params.id);

    await place.isBookingValid(req.body.persons, req.body.from, req.body.until);

    const booking = new Booking({
      tenant: req.user._id,
      place: req.params.id,
      from: req.body.from,
      until: req.body.until,
      persons: req.body.persons
    });
    await booking.save();

    place.bookings.push(booking._id);
    await place.save();

    res.status(201).send({success: true, data: booking});
  }catch (error){
    next(error);
  }
})

router.get('/place/:id/photos/main', async (req, res, next) => {
  try{
    const place = await Place.findById(req.params.id);

    if (!place) {
      throw new ErrorMid(404, 'Place does not exist');
    }

    if (!place.photos || !place.photos.main) {
      throw new ErrorMid(404, 'Place does not have a main photo');
    }

    res.set('Content-Type', 'image/png');
    res.send(place.photos.main);
  }catch (error){
    next(error);
  }
});

router.get('/place/:place_id/photos/secondary/:photo_id', async (req, res, next) => {
  // TODO
  try{
    const place = await Place.findById(req.params.id);

    if (!place) {
      throw new ErrorMid(404, 'Place does not exist');
    }

    if (!place.photos || !place.photos.main) {
      throw new ErrorMid(404, 'Place does not have a main photo');
    }

    res.set('Content-Type', 'image/png');
    res.send(place.photos.main);
  }catch (error){
    next(error);
  }
});

module.exports = router;