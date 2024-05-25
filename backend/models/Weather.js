const mongoose = require('mongoose');

const WeatherSchema = new mongoose.Schema({
  forecast: Array,
  updated: Date
});

module.exports = mongoose.model('Weather', WeatherSchema);
