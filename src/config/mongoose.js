const mongoose = require('mongoose');

const connURL = process.env.DB_CONNECTION_URL;

mongoose.connect(connURL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

