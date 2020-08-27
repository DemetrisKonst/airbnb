const mongoose = require('mongoose')

const ErrorMid = require('../middleware/error.js').ErrorMid

const reviewSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  text: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  place: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Place"
  }
})

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review