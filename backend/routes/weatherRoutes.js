const express = require('express');
const router = express.Router();
const Weather = require('../models/Weather');
const axios = require('axios');

// Fetch and store weather data
router.get('/fetchWeatherData', async (req, res) => {
  try {
    const response = await axios.get('https://api.weather.gov/points/39.7456,-97.0892/forecast');
    const weatherData = response.data;
    const newWeather = new Weather({
      forecast: weatherData.properties.periods,
      updated: new Date()
    });
    await newWeather.save();
    res.status(200).send('Weather data saved successfully');
  } catch (error) {
    res.status(500).send('Error fetching weather data');
  }
});

// Fetch weather data from the database
router.get('/weatherData', async (req, res) => {
  try {
    const weatherData = await Weather.find().sort({ updated: -1 }).limit(1);
    res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).send('Error retrieving weather data');
  }
});

module.exports = router;
