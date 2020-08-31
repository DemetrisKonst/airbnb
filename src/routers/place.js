const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const Place = require('../models/place.js');
const Booking = require('../models/booking.js');
const Photo = require('../models/photo.js');

const router = express.Router();

router.get('/places', async (req, res, next) => {
  try{
    const limit = parseInt(req.query.limit);
    delete req.query.limit;

    const skip = parseInt(req.query.skip);
    delete req.query.skip;

    const allowedSortFields = [
      'cost',
      'area',
      'reviewAverage'
    ]

    const sort = {}

    if (req.query.sortBy){
      const parts = req.query.sortBy.split(':');

      if(!allowedSortFields.includes(parts[0]))
        throw new ErrorMid(422, `Cannot sort by ${parts[0]}`);

      if (parts[0] === 'cost') parts[0] = 'costPerDay';
      else if (parts[0] === 'reviewAverage') parts[0] = 'reviews.average';

      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;

      delete req.query.sortBy;
    }
  

    const requiredFilters = [
      'location',
      'from',
      'until',
      'persons'
    ];

    const queryFilterArr = Object.keys(req.query);

    for (const reqFilter of requiredFilters) {
      if (!queryFilterArr.includes(reqFilter))
        throw new ErrorMid(422, `Filter ${reqFilter} is required`);
    }

    const allowedFilters = [
      'location',
      'from',
      'until',
      'persons',
      'minCost',
      'maxCost',
      'minArea',
      'maxArea',
      'minReviewAverage',
      'type',
      'bedrooms',
      'bathrooms',
      'wifi',
      'airConditioning',
      'heating',
      'kitchen',
      'television',
      'parking',
      'elevator',
      'sittingPlace',
      'smoking',
      'pets',
      'events'
    ];

    for (const qFilter of queryFilterArr) {
      if (!allowedFilters.includes(qFilter))
        throw new ErrorMid(422, `Cannot filter by ${qFilter}`);
    }

    let filterObject = {
      'location.neighbourhood': req.query.location,
      maxPersons: {
        $gte: parseInt(req.query.persons)
      }
    };

    const amountOfDays = Math.floor((Date.parse(req.query.until) - Date.parse(req.query.from)) / 24*60*60*1000);

    if (!amountOfDays)
      throw new ErrorMid(400, 'Wrong date format');

    if (amountOfDays <= 0)
      throw new ErrorMid(400, 'From date must be after until date');

    if (req.query.minCost || req.query.maxCost){
      let cpdF;

      if (req.query.minCost){
        const minCPD = parseInt(req.query.minCost) / amountOfDays;
        cpdF.$gt = minCPD;
        delete req.query.minCost;
      }

      if (req.query.maxCost){
        const maxCPD = parseInt(req.query.maxCost) / amountOfDays;
        cpdF.$lt = maxCPD;
        delete req.query.maxCost;
      }
      
      filterObject.costPerDay = cpdF;
    }

    if (req.query.minArea || req.query.maxArea){
      let areaF;

      if (req.query.minArea){
        areaF.$gt = parseInt(req.query.minArea);
        delete req.query.minArea;
      }
      
      if (req.query.maxArea){
        areaF.$lt = parseInt(req.query.maxArea);
        delete req.query.maxArea;
      }

      filterObject.area = areaF;
    }

    if (req.query.minReviewAverage){
      if (req.query.minReviewAverage < 0 || req.query.minReviewAverage > 5)
        throw new ErrorMid(422, 'Review ratings range between 0 and 5');

      filterObject.reviews.average = {$gt: parseInt(req.query.minReviewAverage)};
      delete req.query.minReviewAverage;
    }

    if (req.query.type){
      filterObject.type = req.query.type;
      delete req.query.type;
    }

    if (req.query.bedrooms || req.query.bathrooms){
      let roomsF;
      
      if (req.query.bedrooms){
        roomsF.bedrooms = parseInt(req.query.bedrooms);
        delete req.query.bedrooms;
      }

      if (req.query.bathrooms){
        roomsF.bathrooms = parseInt(req.query.bathrooms);
        delete req.query.bathrooms;
      }

      filterObject.rooms = roomsF;
    }

    if (req.query.wifi||req.query.airConditioning||req.query.heating||req.query.kitchen||req.query.television||req.query.parking||req.query.elevator||req.query.sittingPlace){
      let amenF;

      if (req.query.wifi){
        amenF.wifi = req.query.wifi;
        delete req.query.wifi;
      }
      if (req.query.airConditioning){
        amenF.airConditioning = req.query.airConditioning;
        delete req.query.airConditioning;
      }
      if (req.query.heating){
        amenF.heating = req.query.heating;
        delete req.query.heating;
      }
      if (req.query.kitchen){
        amenF.kitchen = req.query.kitchen;
        delete req.query.kitchen;
      }
      if (req.query.television){
        amenF.television = req.query.television;
        delete req.query.television;
      }
      if (req.query.parking){
        amenF.parking = req.query.parking;
        delete req.query.parking;
      }
      if (req.query.elevator){
        amenF.elevator = req.query.elevator;
        delete req.query.elevator;
      }
      if (req.query.sittingPlace){
        amenF.sittingPlace = req.query.sittingPlace;
        delete req.query.sittingPlace;
      }

      filterObject.amenities = amenF;
    }

    if (req.query.smoking || req.query.pets || req.query.events){
      let rulesF;

      if (req.query.smoking){
        rulesF.smoking = req.query.smoking;
        delete req.query.smoking;
      }
      if (req.query.pets){
        rulesF.pets = req.query.pets;
        delete req.query.pets;
      }
      if (req.query.events){
        rulesF.events = req.query.events;
        delete req.query.events;
      }

      filterObject.rules = rulesF;
    }

    // console.log(filterObject);

    const places = await Place.find(filterObject, '-photos', {
      limit,
      skip,
      sort
    });

    res.status(200).send(places);

  }catch (error){
    next(error);
  }
});

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
      });

    if (!place)
      throw new ErrorMid(404, 'Place does not exist');

    res.send(place);
  }catch (error){
    next(error);
  }
});

router.get('/place/:id/photos/main', async (req, res, next) => {
  try{
    const place = await Place.findById(req.params.id);

    if (!place) {
      throw new ErrorMid(404, 'Place does not exist');
    }

    if (!place.photos || !place.photos.main) {
      throw new ErrorMid(404, 'Place does not have a main photo');
    }

    const photo = await Photo.findById(place.photos.main);
    const buffer = photo.binary;

    res.set('Content-Type', 'image/png');
    res.send(buffer);
  }catch (error){
    next(error);
  }
});

router.get('/place/:place_id/photos/secondary/:photo_id', async (req, res, next) => {
  try{
    const place = await Place.findById(req.params.place_id);

    if (!place) {
      throw new ErrorMid(404, 'Place does not exist');
    }

    if (!place.photos || !place.photos.secondary) {
      throw new ErrorMid(404, 'Place does not have any secondary photo');
    }

    console.log(place.photos.secondary);

    if (!place.photos.secondary.includes(req.params.photo_id))
      throw new ErrorMid(404, 'Photo does not exist');

    const photo = await Photo.findById(req.params.photo_id);
    const buffer = photo.binary;

    res.set('Content-Type', 'image/png');
    res.send(buffer);
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
});

module.exports = router;