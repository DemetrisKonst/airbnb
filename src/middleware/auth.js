const jwt = require('jsonwebtoken');
require('dotenv').config();

const ErrorMid = require('./error').ErrorMid;
const User = require('../models/user.js');

const jwtSecret = process.env.JWT_SECRET;

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const id = jwt.verify(token, jwtSecret).id;
    
    const user = await User.findOne({_id: id});

    // console.log(user);
    

    req.token = token;
    req.user = user;

    next();
  } catch (error) {
    throw new ErrorMid(401, 'Incorrect authentication');
  }
}

const generateToken = (id) => {
  return jwt.sign({id: id.toString()}, jwtSecret);
}

module.exports = {auth, generateToken};