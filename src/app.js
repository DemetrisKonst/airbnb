const express = require('express');
const app = express();

const handleError = require('./middleware/error.js').handleError;
require('./config/mongoose.js');
const userRouter = require('./routers/user.js');
const placeRouter = require('./routers/place.js');

const port = process.env.PORT || 3000;

app.use(express.json());

app.use(userRouter);
app.use(placeRouter);

app.use( (err, req, res, next) => {
  handleError(err, res);
});

app.listen(port, () => console.log('Server up on port ' + port));