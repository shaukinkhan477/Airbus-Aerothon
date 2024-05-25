require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');
const WebSocket = require('ws');
const Weather = require('./models/Weather');
const Flight = require('./models/Flight');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('dev'));

mongoose.connect('mongodb://localhost:27017/aviationDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

const server = app.listen(process.env.PORT || 3002, () => {
  console.log(`Server running on port ${process.env.PORT || 3002}`);
});

const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', ws => {
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
  });
});

const broadcast = data => {
  clients.forEach(client => client.send(JSON.stringify(data)));
};

// Fetch and store weather data from NWS API
app.get('/api/fetchWeatherData', async (req, res) => {
  try {
    const lat = 39.7456;
    const lon = -97.0892;
    const gridResponse = await axios.get(`https://api.weather.gov/points/${lat},${lon}`);
    const { gridId, gridX, gridY } = gridResponse.data.properties;
    const forecastResponse = await axios.get(`https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`);
    const weatherData = forecastResponse.data;
    const newWeather = new Weather({
      forecast: weatherData.properties.periods,
      updated: new Date()
    });
    await newWeather.save();
    broadcast({ type: 'weather', data: newWeather });
    res.status(200).json({ message: 'Weather data saved successfully' });
  } catch (error) {
    console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching weather data', details: error.response ? error.response.data : error.message });
  }
});

// Fetch stored weather data
app.get('/api/weatherData', async (req, res) => {
  try {
    const weatherData = await Weather.find().sort({ updated: -1 }).limit(1);
    res.status(200).json(weatherData);
  } catch (error) {
    console.error('Error retrieving weather data:', error);
    res.status(500).send('Error retrieving weather data');
  }
});

// Fetch and store flight data from AviationStack API
app.get('/api/fetchFlightData', async (req, res) => {
  try {
    const accessKey = process.env.AVIATIONSTACK_API_KEY;
    const response = await axios.get(`http://api.aviationstack.com/v1/flights?access_key=${accessKey}`);
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
    broadcast({ type: 'flight', data: flightData });
    res.status(200).send('Flight data saved successfully');
  } catch (error) {
    console.error('Error fetching flight data:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching flight data' });
  }
});

// Fetch flight data from the database
app.get('/api/flightData', async (req, res) => {
  try {
    const flightData = await Flight.find().sort({ departureTime: -1 });
    res.status(200).json(flightData);
  } catch (error) {
    console.error('Error retrieving flight data:', error);
    res.status(500).send('Error retrieving flight data');
  }
});

// Optimal Route Calculation
const calculateOptimalRoute = async () => {
  const weatherData = await Weather.find().sort({ updated: -1 }).limit(1);
  const flightData = await Flight.find().sort({ departureTime: -1 });

  const optimalRoute = {
    route: [
      { waypoint: 'A', condition: 'Clear' },
      { waypoint: 'B', condition: 'Fog' },
      { waypoint: 'C', condition: 'Rain' }
    ],
    riskAssessment: 'Medium'
  };

  return optimalRoute;
};

app.get('/api/optimalRoute', async (req, res) => {
  try {
    const optimalRoute = await calculateOptimalRoute();
    res.status(200).json(optimalRoute);
  } catch (error) {
    console.error('Error calculating optimal route:', error);
    res.status(500).send('Error calculating optimal route');
  }
});

// Example route to ensure the server is working
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'API is working' });
});

// Handle errors
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

module.exports = app;
