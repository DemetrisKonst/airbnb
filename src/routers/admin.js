const express = require('express');
const mongoose = require('mongoose');

const {auth, generateToken} = require('../middleware/auth.js');
const ErrorMid = require('../middleware/error.js').ErrorMid;

const User = require('../models/user.js');
const Place = require('../models/place.js');
const Review = require('../models/review.js');
const Booking = require('../models/booking.js');

const router = express.Router();

router.get('/admin/users', auth, async (req, res, next) => {
  try{
    if (req.user.role !== "Admin") throw new ErrorMid(403, 'Admin permissions required');
    
    const limit = parseInt(req.query.limit);
    delete req.query.limit;

    const skip = parseInt(req.query.skip);
    delete req.query.skip;

    const allowedFields = [
      'userName',
      'firstName',
      'lastName',
      'email',
      'role',
      'tel',
      'DoB',
      'approvedByAdmin'
    ]

    const sort = {}
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':')

      if (!allowedFields.includes(parts[0]))
        throw new ErrorMid(422, 'Cannot sort by ' + parts[0]);

      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1

      delete req.query.sortBy;
    }

    const queryFilters = Object.keys(req.query);

    for (const filter of queryFilters) {
      if (!allowedFields.includes(filter)) throw new ErrorMid(422, 'Cannot filter by ' + filter);
    }

    const users = await User.find(req.query, '-password -avatar', {
      limit,
      skip,
      sort
    });

    res.status(200).send({success: true, data: users})
  }catch (error){
    next(error);
  }
});

router.patch('/admin/user/approve/:id', auth, async (req, res, next) => {
  try{
    if (req.user.role !== "Admin") throw new ErrorMid(403, 'Admin permissions required');

    await User.findByIdAndUpdate(req.params.id, {approvedByAdmin: true});

    res.send({success: true});
  }catch (error){
    next(error);
  }
});

router.patch('/admin/user/block/:id', auth, async (req, res, next) => {
  try{
    if (req.user.role !== "Admin") throw new ErrorMid(403, 'Admin permissions required');

    await User.findByIdAndUpdate(req.params.id, {approvedByAdmin: false});

    res.send({success: true});
  }catch (error){
    next(error);
  }
});

router.get('/admin/database', auth, async (req, res, next) => {
  try{
    if (req.user.role !== "Admin")
      throw new ErrorMid(403, 'Admin permissions required');

    if (!req.query.format)
      throw new ErrorMid(422, 'Format of export is required (json or xml)');

    if (req.query.format !== 'json' && req.query.format !== 'xml')
      throw new ErrorMid(422, 'Format can only be json or xml');

    const users = await User.find({role: {$ne: 'Admin'}}, '-password -__v');
    const places = await Place.find({}, '-__v -photos')
      .populate('owner', '_id userName firstName lastName')
      .populate({
        path: 'bookings',
        select: '-place -__v',
        populate: {
          path: 'tenant',
          select: '_id userName firstName lastName'
        }
      })
      .populate({
        path: 'reviews.review_ids',
        select: '-place -__v',
        populate: {
          path: 'user',
          select: '_id userName firstName lastName'
        }
      });

    res.status(200).send({success: true, data: {users, places}});
  }catch (error){
    next(error);
  }
});

module.exports = router;