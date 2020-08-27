const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const User = require('../models/user.js');

const router = express.Router();

// router.get('/', async(req, res, next) => {
//   try{
//     res.sendFile('/home/dimitris/Documents/code/web/tedi/public/index.html');
//   }catch (error){
//     next(error);
//   }
// });

router.post('/users', async (req, res, next) => {
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

router.post('/users/login', async (req, res, next) => {
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

router.get('/users/me', auth, async (req, res, next) => {
  try{
    res.send(await req.user.view());
  }catch (error){
    next(error);
  }
});

router.patch('/users/me', auth, async (req, res, next) => {
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

router.delete('/users/me', auth, async (req, res, next) => {
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

router.put('/users/me/avatar', auth, upload.single('avatar'), async (req, res, next) => {
  try{
    const buffer = await sharp(req.file.buffer).resize(250, 250).png().toBuffer();
    req.user.avatar = buffer;
    await req.user.save();

    res.status(201).send();
  }catch (error){
    next(error);
  }
});

router.get('/users/:id/avatar', async (req, res, next) => {
  try{
    const user = await User.findById(req.params.id)

    if (!user) {
      throw new ErrorMid(404, 'User does not exist');
    }

    if (!user.avatar) {
      throw new ErrorMid(404, 'User does not have an avatar');
    }

    res.set('Content-Type', 'image/png')
    res.send(user.avatar)
  }catch (error){
    next(error);
  }
});

router.delete('/users/me/avatar', auth, async (req, res, next) => {
  try{
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
  }catch (error){
    next(error);
  }
})

module.exports = router;