const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Simple request logger
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const log = `${timestamp} - ${req.method} ${req.originalUrl} - ${req.ip}\n`;
  fs.appendFile(path.join(logDir, 'requests.log'), log, (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
  next();
};

// Validate API key middleware
const validateApiKey = (req, res, next) => {
  if (!process.env.API_KEY) {
    console.error('API_KEY is not set in environment variables');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error',
      message: 'API key not configured'
    });
  }
  next();
};

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Middleware
app.use(helmet()); // Set security headers
app.use(requestLogger); // Log all requests

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : (process.env.NODE_ENV === 'production' 
    ? ['https://sportsorca.com', 'https://www.sportsorca.com'] 
    : ['http://localhost:3000']);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    
    return callback(null, true);
  },
  methods: ['GET'],
  credentials: true
}));

app.use(express.json({ limit: '10kb' })); // Body size limit
app.use(limiter); // Apply rate limiting to all routes

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Ball Don't Lie API Base URL
const API_BASE_URL = 'https://api.balldontlie.io/v1';

// Helper function to format date for API
const formatDateForAPI = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Helper function to get upcoming dates (next 7 days)
const getUpcomingDates = () => {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(formatDateForAPI(date));
  }
  
  return dates;
};

// Route to get upcoming NBA games
app.get('/api/games/upcoming', validateApiKey, async (req, res) => {
  try {
    const upcomingDates = getUpcomingDates();
    let allGames = [];

    // Note: For free tier, we'll focus on today's and tomorrow's games to avoid rate limits
    const limitedDates = upcomingDates.slice(0, 2);

    // Create API request headers with API key
    const headers = {
      'Authorization': process.env.API_KEY,
      'Accept': 'application/json',
      'User-Agent': 'SportsOrca/1.0'
    };

    for (const date of limitedDates) {
      try {
        const response = await axios.get(`${API_BASE_URL}/games`, {
          params: {
            dates: [date],
            per_page: 25
          },
          headers,
          timeout: 10000 // 10 second timeout
        });

        if (response.data && response.data.data) {
          // Filter for games that haven't started yet or are in progress
          const upcomingGames = response.data.data.filter(game => {
            const gameDateTime = new Date(game.datetime || game.date);
            const now = new Date();
            return gameDateTime >= now || game.status !== 'Final';
          });

          allGames = [...allGames, ...upcomingGames];
        }

        // Add delay to respect rate limits (free tier: 5 requests per minute)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error fetching games for ${date}:`, error.message);
        // Continue to next date instead of failing entire request
      }
    }

    // If no upcoming games found, get recent games to demonstrate the functionality
    if (allGames.length === 0) {
      console.log('No upcoming games found, fetching recent games for demo...');
      try {
        const response = await axios.get(`${API_BASE_URL}/games`, {
          params: {
            start_date: '2025-03-01',
            end_date: '2025-06-30',
            per_page: 8
          },
          headers,
          timeout: 10000
        });

        if (response.data && response.data.data) {
          allGames = response.data.data.map(game => ({
            ...game,
            // Mark these as demo games
            demo: true,
            // Adjust dates to show as if they were upcoming
            originalDate: game.date,
            date: formatDateForAPI(new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000)),
            datetime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'Upcoming',
            home_team_score: null,
            visitor_team_score: null
          }));
        }
      } catch (error) {
        console.error('Error fetching demo games:', error.message);
      }
    }

    // Sort games by date/time
    allGames.sort((a, b) => new Date(a.datetime || a.date) - new Date(b.datetime || b.date));

    res.json({
      success: true,
      data: allGames,
      count: allGames.length,
      api_url: API_BASE_URL,
      demo_mode: allGames.length > 0 && allGames[0].demo,
      message: allGames.length > 0 && allGames[0].demo ? 
        'No upcoming games in current NBA season. Showing demo data based on recent games.' : 
        'Live upcoming games data'
    });

  } catch (error) {
    console.error('Error fetching upcoming games:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming games',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred while fetching game data' 
        : error.message
    });
  }
});

// Route to get all NBA teams
app.get('/api/teams', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/teams`, {
      headers: {
        'Authorization': process.env.API_KEY,
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    res.json({
      success: true,
      data: response.data.data,
      api_url: API_BASE_URL
    });
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch teams',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve team information at this time' 
        : error.message
    });
  }
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SportsOrca NBA API Server is running',
    timestamp: new Date().toISOString(),
    api_url: API_BASE_URL
  });
});

// In production, serve the React app for any unknown paths
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`API URL: ${API_BASE_URL}`);
  
  if (!process.env.API_KEY) {
    console.warn('⚠️ WARNING: API_KEY is not set in environment variables');
    console.log('Please create a .env file based on the .env.example template');
  }
});
