const express = require('express');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;
const User = require('../models/user.js');

const router = express.Router();

router.post('/users', async (req, res, next) => {
  const user = new User(req.body);
  
  try{
    await user.save((err) => {
      if (err) throw new ErrorMid(500, "Unexpected Server Error: " + err);
    });

    const data = {
      user: user,
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
      user: user,
      token: generateToken(user._id)
    }
    res.status(200).send({success: true, data: data});

  }catch (error){
    next(error);
  }
});

router.get('/users/me', auth, async (req, res, next) => {
  try{
    res.send(req.user);
  }catch (error){
    next(error);
  }
});

router.patch('/users/me', auth, async (req, res, next) => {
  try{
    const userUpdates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age'];

    for (const update of userUpdates) {
      if (!allowedUpdates.includes(update)) throw new ErrorMid(422, 'Cannot update field ' + update);
    }

    userUpdates.forEach((update) => req.user[update] = req.body[update]);
    await req.user.save((err) => {
      if (err) throw new ErrorMid(500, "Unexpected Server Error: " + err);
    });
    res.status(200).send(req.user);
  }catch (error){
    next(error);
  }
});

router.delete('/users/me', auth, async (req, res, next) => {
  try{
    await req.user.remove();
    res.status(200).send(req.user);
  }catch (error){
    next(error);
  }
});

module.exports = router;