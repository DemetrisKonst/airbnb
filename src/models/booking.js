const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  place: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place",
    required: true
  },
  from: {
    type: Date,
    required: true
  },
  until: {
    type: Date,
    required: true
  },
  persons: {
    type: Number,
    min: 0,
    required: true
  }
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;