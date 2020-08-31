const mongoose = require('mongoose');
const validator = require('validator');

const ErrorMid = require('../middleware/error.js').ErrorMid;

const Booking = require('./booking.js');
const Review = require('./review.js');

const placeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  area: {
    type: Number,
    min: 1
  },
  costPerDay: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    required: true,
    enum: ['Private Room', 'Shared Room', 'Entire Place'],
  },
  bedAmount: {
    type: Number,
    required: true,
    min: 1
  },
  maxPersons: {
    type: Number,
    required: true,
    min: 1
  },
  rooms: {
    bedrooms: {
      type: Number,
      required: true,
      min: 0
    },
    bathrooms: {
      type: Number,
      required: true,
      min: 0,
    }
  },
  reviews: {
    amount: {
      type: Number,
      min: 0
    },
    average: {
      type: Number,
      min: 0
    },
    review_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review"
    }]
  },
  amenities: {
    wifi: Boolean,
    airConditioning: Boolean,
    heating: Boolean,
    kitchen: Boolean,
    television: Boolean,
    parking: Boolean,
    elevator: Boolean,
    sittingPlace: Boolean,
  },
  rules: {
    smoking: Boolean,
    pets: Boolean,
    events: Boolean,
  },
  location: {
    longitude: Number,
    latitude: Number,
    address: {
      type: String,
      trim: true,
    },
    neighbourhood: {
      type: String,
      trim: true,
    },
    transport: {
      type: String,
      trim: true,
    },
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  photos: {
    main: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photo"
    },
    secondary: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photo"
    }]
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking"
  }]
});

placeSchema.methods.isBooked = async function (fromDate, untilDate) {
  for (const booking_id of this.bookings) {
    const booking = await Booking.findById(booking_id);

    if (fromDate <= booking.from){
      if (untilDate > booking.from){
        return true;
      }
    }else if (fromDate < booking.until){
      return true;
    }
  }
}

placeSchema.methods.isBookingValid = async function (persons, from, until) {
  try{
    if (persons < 1)
      throw new ErrorMid(400, 'The amount of persons must be a positive number');

    if (persons > this.maxPersons)
      throw new ErrorMid(400, 'Place can take up to ' + this.maxPersons + ' persons');

    const fromDate = new Date(from);
    const untilDate = new Date(until);

    if (fromDate < Date.now())
      throw new ErrorMid(400, 'From date must not have passed');

    if (fromDate > untilDate)
      throw new ErrorMid(400, 'From date must be before until date');

    if (await this.isBooked(fromDate, untilDate))
      throw new ErrorMid(400, 'Conflict with other booking');
  }catch(error){
    throw error;
  }
}

placeSchema.methods.calculateReviews = async function () {
  let sum = 0;
  let amount = 0;
  
  for (const review_id of this.reviews.review_ids){
    const review = await Review.findById(review_id);
    sum += review.rating;
    amount++;
  }

  this.reviews.amount = amount;
  this.reviews.average = amount === 0 ? 0 : sum / amount;
}

// placeSchema.methods.deleteReview = async function (reviewId)

const Place = mongoose.model('Place', placeSchema);

module.exports = Place;