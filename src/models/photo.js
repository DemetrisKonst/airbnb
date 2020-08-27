const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  binary: {
    type: Buffer,
    required: true
  }
});

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;