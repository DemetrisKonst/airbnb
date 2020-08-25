const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const Place = require('../models/place.js');

const router = express.Router();

router.post('/places', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    req.body.owner = req.user._id;
    const place = new Place(req.body);
    await place.save();

    const data = {
      place //await user.view()
    }
    res.status(201).send({success: true, data: data});

  }catch(error){
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

router.post('/places/:id/photos/main', auth, upload.single('main'), async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(400, 'Place does not exist');

    const buffer = await sharp(req.file.buffer).resize(640, 480).png().toBuffer();

    if (place.photos) {
      place.photos.main = buffer;
    }else{
      place.photos = {
        main: buffer,
        secondary: []
      };
    }
    
    await place.save();

    res.status(201).send();
  }catch (error){
    next(error);
  }
});

router.get('/places/:id/photos/main', async (req, res, next) => {
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

router.delete('/places/:id/photos/main', auth, async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(400, 'Place does not exist');

    if (place.photos) {
      place.photos.main = undefined;
    }else{
      place.photos = {
        main: undefined,
        secondary: []
      };
    }

    await place.save();

    res.send();
  }catch (error){
    next(error);
  }
});

router.post('/places/:id/photos/secondary', auth, upload.single('photo'), async (req, res, next) => {
  try{
    if (req.user.role !== 'Host' && req.user.role !== 'Both')
      throw new ErrorMid(403, 'User is not a host');

    const place = await Place.findOne({_id: req.params.id, owner: req.user._id});

    if (!place) throw new ErrorMid(400, 'Place does not exist');

    const buffer = await sharp(req.file.buffer).resize(640, 480).png().toBuffer();

    const photoObject = {_id: mongoose.Types.ObjectId(), buffer};
    if (place.photos) {
      place.photos.secondary.push(photoObject);
    }else{
      place.photos = {
        main: undefined,
        secondary: [photoObject]
      };
    }
    
    await place.save();

    res.status(201).send({success: true, data: {_id: photoObject._id}});
  }catch (error){
    next(error);
  }
});

router.get('/places/:place_id/photos/secondary/:photo_id', async (req, res, next) => {
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

router.get('/places/:id', async (req, res, next) => {
  try{
    const place = await Place.findById(req.params.id).populate('owner', 'firstName lastName');

    if (!place)
      throw new ErrorMid(404, 'Place does not exist');

    res.send(place);
  }catch (error){
    next(error);
  }
});

// router.patch('/places/:id', auth, async (req, res, next) => {
//   try{
//     const userUpdates = Object.keys(req.body);
//     const allowedUpdates = ['userName', 'firstName', 'lastName', 'tel', 'email', 'password', 'DoB'];

//     for (const update of userUpdates) {
//       if (!allowedUpdates.includes(update)) throw new ErrorMid(422, 'Cannot update field ' + update);
//     }

//     userUpdates.forEach((update) => req.user[update] = req.body[update]);
//     await req.user.save((err) => {
//       if (err) throw new ErrorMid(500, "Unexpected Server Error: " + err);
//     });
//     res.status(200).send(await req.user.view());
//   }catch (error){
//     next(error);
//   }
// });

router.delete('/places/:id', auth, async (req, res, next) => {
  try{
    const place = await Place.findOneAndDelete({ _id: req.params.id, owner: req.user._id })

    if (!place) throw new ErrorMid(404, 'Place does not exist');

    res.send(place);
  }catch (error){
    next(error);
  }
});

module.exports = router;