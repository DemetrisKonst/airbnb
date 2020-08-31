const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const Photo = require('../models/photo.js');
const Place = require('../models/place.js');

const router = express.Router();

// TODO: approvedByAdmin

router.get('/host/me/places', auth, async (req, res, next) => {
  // TODO
})

router.post('/host/me/place', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

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

    const place = await Place.findOneAndDelete({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(404, 'Place does not exist');

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