const mongoose = require('mongoose');
const validator = require('validator');

const ErrorMid = require('../middleware/error.js').ErrorMid;

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
    data: []
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
      type: Buffer
    },
    secondary: []
  }
});

placeSchema.methods.smallView = async function () {
  return {
    _id: this._id,
    name: this.name,
    description: this.description,
    costPerDay: this.costPerDay,
    type: this.type,
    bedAmount: this.bedAmount,
    rooms: this.rooms,
    reviewAmount: this.reviews.amount,
    reviewAverage: this.reviews.average,
    wifi: this.amenities.wifi,
    kitchen: this.amenities.kitchen,
    neighbourhood: this.location.neighbourhood,
    transport: this.location.transport
  };
}

const Place = mongoose.model('Place', placeSchema);

module.exports = Place;