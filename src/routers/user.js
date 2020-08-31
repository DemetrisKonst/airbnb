const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;

const User = require('../models/user.js');
const Photo = require('../models/photo.js');
const Conversation = require('../models/conversation.js');

const router = express.Router();

router.post('/user', async (req, res, next) => {
  try{
    const user = new User(req.body);
    await user.save();

    const data = {
      user: await user.view(),
      token: generateToken(user._id)
    }
    res.status(201).send({success: true, data: data});

  }catch(error){
    next(error);
  }
});

router.post('/user/login', async (req, res, next) => {
  try{
    const user = await User.findByCredentials(req.body.email, req.body.password);
    
    const data = {
      user: await user.view(),
      token: generateToken(user._id)
    }
    res.status(200).send({success: true, data: data});

  }catch (error){
    next(error);
  }
});

router.get('/user/me', auth, async (req, res, next) => {
  try{
    res.send(await req.user.view());
  }catch (error){
    next(error);
  }
});

router.patch('/user/me', auth, async (req, res, next) => {
  try{
    const userUpdates = Object.keys(req.body);
    const allowedUpdates = ['userName', 'firstName', 'lastName', 'tel', 'email', 'password', 'DoB'];

    for (const update of userUpdates) {
      if (!allowedUpdates.includes(update)) throw new ErrorMid(422, 'Cannot update field ' + update);
    }

    userUpdates.forEach((update) => req.user[update] = req.body[update]);
    await req.user.save((err) => {
      if (err) throw new ErrorMid(500, "Unexpected Server Error: " + err);
    });
    res.status(200).send(await req.user.view());
  }catch (error){
    next(error);
  }
});

router.delete('/user/me', auth, async (req, res, next) => {
  try{
    await req.user.remove();
    res.status(200).send(await req.user.view());
  }catch (error){
    next(error);
  }
});

const upload = multer({
  limits: {
      fileSize: 1000000
  },
  fileFilter(req, file, cb) {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
          return cb(new Error('Please upload an image'));
      }

      cb(undefined, true);
  }
});

router.put('/user/me/avatar', auth, upload.single('avatar'), async (req, res, next) => {
  try{
    const buffer = await sharp(req.file.buffer).resize(250, 250).png().toBuffer();
    
    const photo = new Photo({binary: buffer});
    await photo.save();

    req.user.avatar = photo._id;
    await req.user.save();

    res.status(201).send({success: true});
  }catch (error){
    next(error);
  }
});

router.get('/user/:id/avatar', async (req, res, next) => {
  try{
    const user = await User.findById(req.params.id)

    if (!user) {
      throw new ErrorMid(404, 'User does not exist');
    }

    if (!user.avatar) {
      throw new ErrorMid(404, 'User does not have an avatar');
    }

    const photo = await Photo.findById(user.avatar);
    const buffer = photo.binary;

    res.set('Content-Type', 'image/png');
    res.status(200).send(buffer);
  }catch (error){
    next(error);
  }
});

router.delete('/user/me/avatar', auth, async (req, res, next) => {
  try{
    const photo = await Photo.findByIdAndDelete(req.user.avatar);

    req.user.avatar = undefined;
    await req.user.save();

    res.status(200).send({success: true});
  }catch (error){
    next(error);
  }
});



router.post('/user/me/message/:id', auth, async (req, res, next) => {
  try{
    const sender_id = req.user._id;
    const receiver_id = req.params.id;

    if (sender_id === receiver_id)
      throw new ErrorMid(400, 'Unable to send message to self');

    const receiver = await User.findById(receiver_id);

    if (!receiver) throw new ErrorMid(400, 'User does not exist'); 

    let conversation = await Conversation.findOne({
      $or: [ {user1: sender_id, user2: receiver_id}, {user1: receiver_id, user2: sender_id}]
    });

    if (!conversation){
      conversation = new Conversation({
        messages: [{
          text: req.body.text,
          createdAt: Date.now(),
          sender: sender_id
        }],
        user1: sender_id,
        user2: receiver_id
      });

      await conversation.save();
    }else{
      conversation.messages.push({
        text: req.body.text,
        createdAt: Date.now(),
        sender: sender_id
      });

      await conversation.save();
    }

    res.status(201).send({success: true, data: conversation});
  }catch (error){
    next(error);
  }
});

router.get('/user/me/messages/:id', auth, async (req, res, next) => {
  try{
    const skip = parseInt(req.query.skip);
    const limit = parseInt(req.query.limit);

    const sender_id = req.user._id;
    const receiver_id = req.params.id;

    if (sender_id === receiver_id)
      throw new ErrorMid(400, 'Unable to send message to self');

    const receiver = await User.findById(receiver_id);

    if (!receiver) throw new ErrorMid(400, 'User does not exist'); 

    const conversation = await Conversation.findOne({
      $or: [ {user1: sender_id, user2: receiver_id}, {user1: receiver_id, user2: sender_id}]
    }, {
      'messages': {$slice: [skip, limit]}
    });

    res.status(200).send({success: true, data: conversation});
  }catch (error){
    next(error);
  }
});

module.exports = router;