const jwt = require('jsonwebtoken');

const ErrorMid = require('./error').ErrorMid;
const User = require('../models/user.js');

const jwtSecret = process.env.JWT_SECRET;

// The following function is a middleware, in endpoints that require authentication,
// it is used by placing it before the actual function of the endpoint in the expressjs
// arguments. At first it verifies the jwt and then looks up the user in the db

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const id = jwt.verify(token, jwtSecret).id;
    
    const user = await User.findOne({_id: id});
    
    if (!user) throw new Error();

    req.token = token;
    req.user = user;

    next();
  } catch (error) {
    res.status(401).send({success: false, message: 'Incorrect authentication'});
  }
}

const generateToken = (id) => {
  return jwt.sign({id: id.toString()}, jwtSecret);
}

module.exports = {auth, generateToken};