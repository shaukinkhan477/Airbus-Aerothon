const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
  flightNumber: String,
  airline: String,
  departure: String,
  arrival: String,
  status: String,
  departureTime: Date,
  arrivalTime: Date
});

module.exports = mongoose.model('Flight', FlightSchema);
