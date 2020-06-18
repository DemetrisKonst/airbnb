// MulterError = require('multer').MulterError;

class ErrorMid extends Error {
  constructor(statusCode, message) {
    super();
    this.statusCode = statusCode;
    this.message = message;
  }
}

const handleError = (err, res) => {
  // if (err instanceof MulterError){
  //   err = new ErrorHandler(400, err.message);
  // }else 
  if(!err.statusCode){
    console.log(err);
    err = new ErrorMid(500, 'Unhandled Error: ' + err.message);
  }
  
  const { statusCode, message } = err;
  res.status(statusCode).send({success: false, message});
};

module.exports = {
  ErrorMid,
  handleError
}