const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const ErrorMid = require('../middleware/error.js').ErrorMid;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      validate(value) {
          if (!validator.isEmail(value)) {
              throw new ErrorMid(422, 'Email is invalid');
          }
      }
  },
  password: {
      type: String,
      required: true,
      minlength: 7,
      trim: true,
      validate(value) {
          if (value.toLowerCase().includes('password')) {
              throw new ErrorMid(422, 'Password cannot contain "password"')
          }
      }
  },
  age: {
      type: Number,
      default: 0,
      validate(value) {
          if (value < 0) {
              throw new ErrorMid(422, 'Age must be a postive number')
          }
      }
  }
});

userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new ErrorMid(400, 'Incorrect Email or Password');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ErrorMid(400, 'Incorrect Email or Password');
  }

  return user;
};

userSchema.pre('save', async function (next) {
  const user = this;
  
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }

  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;