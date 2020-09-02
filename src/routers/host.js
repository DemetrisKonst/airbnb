const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const Photo = require('../models/photo.js');
const Place = require('../models/place.js');

const router = express.Router();

router.get('/host/me/places', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const limit = parseInt(req.query.limit);
    delete req.query.limit;

    const skip = parseInt(req.query.skip);
    delete req.query.skip;

    const allowedSortFields = [
      'cost',
      'area',
      'reviewAverage',
      'maxPersons'
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

    const allowedFilters = [
      'location',
      'isBooked',
      'from',
      'until',
      'minmaxPersons',
      'maxmaxPersons',
      'minCostPerDay',
      'maxCostPerDay',
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

    const queryFilterArr = Object.keys(req.query);

    for (const qFilter of queryFilterArr) {
      if (!allowedFilters.includes(qFilter))
        throw new ErrorMid(422, `Cannot filter by ${qFilter}`);
    }

    let filterObject = {};

    // LOCATION
    if (req.query.location){
      filterObject['location.neighbourhood'] = req.query.location;
    }

    // MIN-MAX MAXPERSONS
    if (req.query.maxmaxPersons || req.query.minmaxPersons){
      let maxPF = {};

      if (req.query.minmaxPersons){
        maxPF.$gte = parseInt(req.query.minmaxPersons);
        delete req.query.minmaxPersons;
      }

      if (req.query.maxmaxPersons){
        maxPF.$lte = parseInt(req.query.maxmaxPersons);
        delete req.query.maxmaxPersons;
      }

      filterObject.maxPersons = maxPF;
    }

    // MIN-MAX COST (converted into costPerDay)
    if (req.query.minCostPerDay || req.query.maxCostPerDay){
      let cpdF = {};

      if (req.query.minCostPerDay){
        cpdF.$gte = parseInt(req.query.minCostPerDay);;
        delete req.query.minCostPerDay;
      }

      if (req.query.maxCostPerDay){
        cpdF.$lte = parseInt(req.query.maxCostPerDay);
        delete req.query.maxCostPerDay;
      }
      
      filterObject.costPerDay = cpdF;
    }

    // MIN-MAX AREA
    if (req.query.minArea || req.query.maxArea){
      let areaF = {};

      if (req.query.minArea){
        areaF.$gte = parseInt(req.query.minArea);
        delete req.query.minArea;
      }
      
      if (req.query.maxArea){
        areaF.$lte = parseInt(req.query.maxArea);
        delete req.query.maxArea;
      }

      filterObject.area = areaF;
    }

    // MINIMUM REVIEW AVERAGE
    if (req.query.minReviewAverage){
      if (req.query.minReviewAverage < 0 || req.query.minReviewAverage > 5)
        throw new ErrorMid(422, 'Review ratings range between 0 and 5');

      filterObject['reviews.average'] = {$gte: parseInt(req.query.minReviewAverage)};
      delete req.query.minReviewAverage;
    }

    // TYPE
    if (req.query.type){
      filterObject.type = req.query.type;
      delete req.query.type;
    }

    // ROOMS
    if (req.query.bedrooms){
      filterObject['rooms.bedrooms'] = parseInt(req.query.bedrooms);
      delete req.query.bedrooms;
    }

    if (req.query.bathrooms){
      filterObject['rooms.bathrooms'] = parseInt(req.query.bathrooms);
      delete req.query.bathrooms;
    }

    // AMENITIES
    if (req.query.wifi){
      filterObject['amenities.wifi'] = req.query.wifi;
      delete req.query.wifi;
    }
    if (req.query.airConditioning){
      filterObject['amenities.airConditioning'] = req.query.airConditioning;
      delete req.query.airConditioning;
    }
    if (req.query.heating){
      filterObject['amenities.heating'] = req.query.heating;
      delete req.query.heating;
    }
    if (req.query.kitchen){
      filterObject['amenities.kitchen'] = req.query.kitchen;
      delete req.query.kitchen;
    }
    if (req.query.television){
      filterObject['amenities.television'] = req.query.television;
      delete req.query.television;
    }
    if (req.query.parking){
      filterObject['amenities.parking'] = req.query.parking;
      delete req.query.parking;
    }
    if (req.query.elevator){
      filterObject['amenities.elevator'] = req.query.elevator;
      delete req.query.elevator;
    }
    if (req.query.sittingPlace){
      filterObject['amenities.sittingPlace'] = req.query.sittingPlace;
      delete req.query.sittingPlace;
    }

    // RULES
    if (req.query.smoking){
      filterObject['rules.smoking'] = req.query.smoking;
      delete req.query.smoking;
    }
    if (req.query.pets){
      filterObject['rules.pets'] = req.query.pets;
      delete req.query.pets;
    }
    if (req.query.events){
      filterObject['rules.events'] = req.query.events;
      delete req.query.events;
    }

    const places = await Place.find(filterObject,
      '-reviews.review_ids -__v -owner', 
      {
        limit,
        skip,
        sort
      })
      .populate({
        path: 'bookings',
        select: '_id tenant from until persons',
      });

    let finalPlaces = [];
    
    for (const place of places) {
      const jsPlace = place.toObject();

      if (req.query.from && req.query.until){
        const fromDate = new Date(req.query.from);
        delete req.query.from;

        const untilDate = new Date(req.query.until);
        delete req.query.until;

        const isBooked = await place.isBooked(fromDate, untilDate)
        if ((req.query.isBooked && isBooked) || (!req.query.isBooked && !isBooked)){
          finalPlaces.push(jsPlace);
        }
      }else{
        finalPlaces.push(jsPlace);
      }
      
    }
  
    res.status(200).send({success: true, places: finalPlaces});
  }catch (error){
    next(error);
  }
})

router.post('/host/me/place', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    if (!req.user.approvedByAdmin)
      throw new ErrorMid(403, 'Host is not approved by admin');

    req.body.owner = req.user._id;
    const place = new Place(req.body);
    await place.save();

    res.status(201).send({success: true, data: place});
  }catch (error){
    next(error);
  }
});

router.patch('/host/me/place/:id', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const placeUpdates = Object.keys(req.body);
    const allowedUpdates = [
      'name',
      'description',
      'area',
      'costPerDay',
      'type',
      'bedAmount',
      'maxPersons',
      'rooms',
      'amenities',
      'rules',
      'location'
    ];

    for (const update of placeUpdates) {
      if (!allowedUpdates.includes(update)) throw new ErrorMid(422, 'Cannot update field ' + update);
    }

    const place = await Place.findOneAndUpdate({_id: req.params.id, owner: req.user._id}, req.body);

    if (!place) throw new ErrorMid(404, 'Place does not exist');

    res.status(200).send({success: true});
  }catch (error){
    next(error);
  }
});

router.delete('/host/me/place/:id', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});
    
    if (!place) throw new ErrorMid(404, 'Place does not exist');

    await place.remove();

    res.status(200).send({success: true});
  }catch (error){
    next(error);
  }
});


const upload = multer({
  limits: {
      fileSize: 2000000
  },
  fileFilter(req, file, cb) {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
          return cb(new Error('Please upload an image'));
      }

      cb(undefined, true);
  }
});


router.put('/host/me/place/:id/photo/main', auth, upload.single('main'), async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(404, 'Place does not exist');

    const buffer = await sharp(req.file.buffer).resize(640, 480).png().toBuffer();
    
    const photo = new Photo({binary: buffer});
    await photo.save();
    
    if (place.photos.main) {
      place.photos.secondary.push(place.photos.main);
    }
    place.photos.main = photo._id;

    await place.save();

    res.status(201).send({success: true, data: {id: photo._id}});
  }catch (error){
    next(error);
  }
});

router.delete('/host/me/place/:id/photo/main', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(404, 'Place does not exist');

    const photo = await Photo.findByIdAndDelete(place.photos.main);
    
    place.photos.main = undefined;
    await place.save();

    res.status(200).send({success: true, data: {id: photo._id}});
  }catch (error){
    next(error);
  }
});

router.post('/host/me/place/:id/photo', auth, upload.single('secondary'), async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(404, 'Place does not exist');

    const buffer = await sharp(req.file.buffer).resize(640, 480).png().toBuffer();
    
    const photo = new Photo({binary: buffer});
    await photo.save();
    
    place.photos.secondary.push(photo._id);
    await place.save();

    res.status(201).send({success: true, data: {id: photo._id}});
  }catch (error){
    next(error);
  }
});

router.delete('/host/me/place/:id/photo/:photo_id', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(404, 'Place does not exist');

    const photo = await Photo.findByIdAndDelete(place.photos.main);
    
    place.photos.secondary.pull(photo._id);
    await place.save();

    res.status(200).send({success: true, data: {id: photo._id}});
  }catch (error){
    next(error);
  }
});


module.exports = router;