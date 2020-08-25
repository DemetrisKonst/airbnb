const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const ErrorMid = require('../middleware/error.js').ErrorMid;

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
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
    },
    unique: true
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
  role: {
    type: String,
    required: true,
    enum: ['Host', 'Tenant', 'Both'],
    trim: true
  },
  tel: {
    type: String,
    required: true,
    trim: true
  },
  DoB: {
    type: Date,
    required: true,
  },
  avatar: {
    type: Buffer,
  },
  approvedByAdmin: {
    type: Boolean,
  }
  
});

userSchema.statics.findByCredentials = async function (email, password) {
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

const handleDup = function(error, res, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new ErrorMid(400, Object.keys(error.keyValue) + ' already exists'));
  } else {
    next();
  }
};

userSchema.post('save', handleDup);
userSchema.post('update', handleDup);
userSchema.post('findOneAndUpdate', handleDup);
userSchema.post('insertMany', handleDup);

userSchema.methods.view = async function () {
  return {
    _id: this._id,
    userName: this.userName,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    tel: this.tel,
    DoB: this.DoB,
    role: this.role,
    approvedByAdmin: this.approvedByAdmin ? this.approvedByAdmin : false
  };
}

const User = mongoose.model('User', userSchema);

module.exports = User;