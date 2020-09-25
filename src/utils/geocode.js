const fetch = require('node-fetch');
const { ErrorMid } = require('../middleware/error');

const token = process.env.MAPBOX_TOKEN;

const geocode = async function (location) {
  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + location + '.json?access_token=' + token;

  try{
    const response = await fetch(url);
    const data = response.json();

    return data;
  }catch(error){
    throw new ErrorMid(400, error.message);
  }
}

module.exports = geocode;