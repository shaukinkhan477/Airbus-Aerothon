const express = require('express');
const router = express.Router();
const Flight = require('../models/Flight');
const axios = require('axios');

// Fetch and store flight data
router.get('/fetchFlightData', async (req, res) => {
  try {
    const response = await axios.get('https://api.aviationstack.com/v1/flights?access_key=YOUR_ACCESS_KEY');
    const flightData = response.data.data;
    await Flight.insertMany(flightData.map(flight => ({
      flightNumber: flight.flight.iata,
      airline: flight.airline.name,
      departure: flight.departure.iata,
      arrival: flight.arrival.iata,
      status: flight.flight_status,
      departureTime: flight.departure.estimated,
      arrivalTime: flight.arrival.estimated
    })));
    res.status(200).send('Flight data saved successfully');
  } catch (error) {
    res.status(500).send('Error fetching flight data');
  }
});

// Fetch flight data from the database
router.get('/flightData', async (req, res) => {
  try {
    const flightData = await Flight.find().sort({ departureTime: -1 });
    res.status(200).json(flightData);
  } catch (error) {
    res.status(500).send('Error retrieving flight data');
  }
});

module.exports = router;
