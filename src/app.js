const express = require('express');
const app = express();

const handleError = require('./middleware/error.js').handleError;
require('./config/mongoose.js');
const userRouter = require('./routers/user.js');
const adminRouter = require('./routers/admin.js');
const hostRouter = require('./routers/host.js');
const placeRouter = require('./routers/place.js');
const reviewRouter = require('./routers/review.js');

app.use(express.json());

app.use(userRouter);
app.use(adminRouter);
app.use(hostRouter);
app.use(placeRouter);
app.use(reviewRouter);

app.use( (err, req, res, next) => {
  handleError(err, res);
});

module.exports = app;