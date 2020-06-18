const mongoose = require('mongoose');

const connURL = 'mongodb://127.0.0.1:27017/airbnb';

mongoose.connect(connURL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

