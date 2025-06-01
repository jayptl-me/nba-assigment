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

// Global cache for API responses
const apiCache = {
  teams: {
    data: null,
    timestamp: 0,
    ttl: 12 * 60 * 60 * 1000 // 12 hours in milliseconds (teams rarely change)
  },
  players: {
    data: null,
    timestamp: 0,
    ttl: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  },
  upcomingGames: {
    data: null,
    timestamp: 0,
    ttl: 15 * 60 * 1000 // 15 minutes in milliseconds
  }
};

// Check if cached data is still valid
const isCacheValid = (cacheKey) => {
  const cache = apiCache[cacheKey];
  if (!cache.data) return false;
  
  const now = Date.now();
  return (now - cache.timestamp) < cache.ttl;
};

// Update cache
const updateCache = (cacheKey, data) => {
  apiCache[cacheKey].data = data;
  apiCache[cacheKey].timestamp = Date.now();
};

// Helper to track remaining rate limit
const trackRateLimits = (response) => {
  const limit = response.headers['x-ratelimit-limit'];
  const remaining = response.headers['x-ratelimit-remaining'];
  const reset = response.headers['x-ratelimit-reset'];
  
  if (limit && remaining) {
    console.log(`API Rate Limit: ${remaining}/${limit} requests remaining`);
    
    // Alert when approaching limit
    if (parseInt(remaining) <= 2) {
      console.warn(`⚠️ WARNING: Only ${remaining} API requests remaining until rate limit reset!`);
    }
  }
  
  return { limit, remaining, reset };
};

// Implement retries with exponential backoff
const fetchWithRetry = async (url, config, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If not first attempt, log retry information
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
      }
      
      return await axios(url, config);
    } catch (error) {
      lastError = error;
      
      // If rate limited (429) and not the last attempt, implement backoff
      if (error.response?.status === 429 && attempt < maxRetries) {
        // Get retry-after header or use exponential backoff
        const retryAfter = parseInt(error.response.headers['retry-after'], 10) * 1000 || delay;
        console.log(`Rate limited (429). Waiting ${retryAfter}ms before retry.`);
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        
        // Increase delay for next potential retry (exponential backoff)
        delay *= 2;
      } else {
        throw error; // Re-throw if not rate limited or if max retries reached
      }
    }
  }
  
  throw lastError; // If we get here, all retries failed
};

// Ball Don't Lie API Base URL
const API_BASE_URL = 'https://api.balldontlie.io/v1';

// Helper function to format date for API
const formatDateForAPI = (date) => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Fallback demo data when API is rate limited
const getFallbackDemoGames = () => {
  const now = new Date();
  const teams = [
    { id: 1, abbreviation: "ATL", city: "Atlanta", conference: "East", division: "Southeast", full_name: "Atlanta Hawks", name: "Hawks" },
    { id: 2, abbreviation: "BOS", city: "Boston", conference: "East", division: "Atlantic", full_name: "Boston Celtics", name: "Celtics" },
    { id: 3, abbreviation: "BKN", city: "Brooklyn", conference: "East", division: "Atlantic", full_name: "Brooklyn Nets", name: "Nets" },
    { id: 4, abbreviation: "CHA", city: "Charlotte", conference: "East", division: "Southeast", full_name: "Charlotte Hornets", name: "Hornets" },
    { id: 5, abbreviation: "CHI", city: "Chicago", conference: "East", division: "Central", full_name: "Chicago Bulls", name: "Bulls" },
    { id: 6, abbreviation: "CLE", city: "Cleveland", conference: "East", division: "Central", full_name: "Cleveland Cavaliers", name: "Cavaliers" },
    { id: 7, abbreviation: "DAL", city: "Dallas", conference: "West", division: "Southwest", full_name: "Dallas Mavericks", name: "Mavericks" },
    { id: 8, abbreviation: "DEN", city: "Denver", conference: "West", division: "Northwest", full_name: "Denver Nuggets", name: "Nuggets" }
  ];
  
  // Generate some random matchups
  return Array.from({ length: 5 }, (_, i) => {
    const homeTeamIndex = Math.floor(Math.random() * teams.length);
    let awayTeamIndex = Math.floor(Math.random() * teams.length);
    while (awayTeamIndex === homeTeamIndex) {
      awayTeamIndex = Math.floor(Math.random() * teams.length);
    }
    
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + i + 1);
    const hours = 19 + Math.floor(Math.random() * 3); // Between 7pm and 9pm
    futureDate.setHours(hours, 0, 0, 0);
    
    return {
      id: 1000000 + i,
      date: formatDateForAPI(futureDate),
      datetime: futureDate.toISOString(),
      status: "Upcoming",
      time: `${hours % 12 || 12}:00 ${hours >= 12 ? 'PM' : 'AM'}`,
      home_team: teams[homeTeamIndex],
      visitor_team: teams[awayTeamIndex],
      home_team_score: null,
      visitor_team_score: null,
      period: 0,
      demo: true,
      fallback: true
    };
  });
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

// Middleware to detect API tier and manage requests accordingly
const apiTierManager = async (req, res, next) => {
  try {
    // Skip for health check and other non-API routes
    if (req.path === '/api/health' || !req.path.startsWith('/api/')) {
      return next();
    }
    
    // Check if we have a cached tier
    const tierCacheKey = 'api_tier';
    const tierCacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    
    // If tier isn't cached, make a request to check
    if (!global.apiTier || (Date.now() - global.apiTierLastChecked > tierCacheTTL)) {
      try {
        const response = await axios.get(`${API_BASE_URL}/teams?per_page=1`, {
          headers: {
            'Authorization': process.env.API_KEY,
            'Accept': 'application/json'
          },
          timeout: 5000
        });
        
        // Extract tier information from headers if available
        global.apiTier = response.headers['x-subscription-tier'] || 'free';
        global.apiTierLastChecked = Date.now();
        global.rateLimit = {
          limit: response.headers['x-ratelimit-limit'],
          remaining: response.headers['x-ratelimit-remaining'],
          reset: response.headers['x-ratelimit-reset']
        };
        
        console.log(`Detected API tier: ${global.apiTier}, Rate limit: ${global.rateLimit.remaining}/${global.rateLimit.limit}`);
        
        // For free tier, enforce longer cache TTLs
        if (global.apiTier.toLowerCase() === 'free') {
          apiCache.teams.ttl = 24 * 60 * 60 * 1000; // 24 hours
          apiCache.players.ttl = 24 * 60 * 60 * 1000; // 24 hours
          apiCache.upcomingGames.ttl = 30 * 60 * 1000; // 30 minutes
          console.log('Free tier detected: Extended cache TTLs applied');
        }
      } catch (error) {
        console.error('Error detecting API tier:', error.message);
        // Default to free tier to be safe
        global.apiTier = 'free';
        global.apiTierLastChecked = Date.now();
      }
    }
    
    // For free tier with low remaining requests, enforce stricter caching
    if (global.apiTier === 'free' && global.rateLimit && global.rateLimit.remaining <= 2) {
      console.warn(`⚠️ Rate limit nearly exhausted (${global.rateLimit.remaining}/${global.rateLimit.limit}). Enforcing strict caching.`);
      
      // For critical low remaining requests, extend cache TTLs even more
      apiCache.teams.ttl = 48 * 60 * 60 * 1000; // 48 hours
      apiCache.players.ttl = 48 * 60 * 60 * 1000; // 48 hours
      apiCache.upcomingGames.ttl = 60 * 60 * 1000; // 60 minutes
      
      // For non-essential endpoints, potentially return cached data only
      if (req.path !== '/api/games/upcoming' && req.path !== '/api/teams') {
        if (!isCacheValid(req.path)) {
          return res.status(429).json({
            success: false,
            error: 'rate_limit_critical',
            message: 'Rate limit nearly exhausted. Try again later or upgrade to a higher tier.',
            tier: global.apiTier,
            rate_limit: global.rateLimit
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in API tier manager:', error.message);
    next(); // Continue anyway to not block requests
  }
};

// Route to get upcoming NBA games
app.get('/api/games/upcoming', validateApiKey, async (req, res) => {
  try {
    // Use cache if available and valid
    if (isCacheValid('upcomingGames')) {
      console.log('Serving upcoming games from cache');
      return res.json({
        success: true,
        data: apiCache.upcomingGames.data,
        count: apiCache.upcomingGames.data.length,
        api_url: API_BASE_URL,
        cached: true,
        cache_age: Math.round((Date.now() - apiCache.upcomingGames.timestamp) / 1000),
        message: 'Cached upcoming games data'
      });
    }
    
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
        const response = await fetchWithRetry(
          `${API_BASE_URL}/games`,
          {
            params: {
              dates: [date],
              per_page: 25
            },
            headers,
            timeout: 10000 // 10 second timeout
          },
          3, // max retries
          2000 // initial delay in ms
        );

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
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error fetching games for ${date}:`, error.message);
        // Continue to next date instead of failing entire request
      }
    }

    // If no upcoming games found, get recent games to demonstrate the functionality
    if (allGames.length === 0) {
      console.log('No upcoming games found, fetching recent games for demo...');
      try {
        const response = await fetchWithRetry(
          `${API_BASE_URL}/games`,
          {
            params: {
              start_date: '2025-03-01',
              end_date: '2025-06-30',
              per_page: 8
            },
            headers,
            timeout: 10000
          },
          3, // max retries
          2000 // initial delay
        );

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
        
        // If we can't get demo games from API, provide local fallback data
        if (error.response?.status === 429) {
          console.log('Providing fallback demo data due to rate limiting');
          allGames = getFallbackDemoGames();
        }
      }
    }

    // Sort games by date/time
    allGames.sort((a, b) => new Date(a.datetime || a.date) - new Date(b.datetime || b.date));
    
    // Cache the results
    updateCache('upcomingGames', allGames);
    
    // Track rate limits if headers are available
    const rateLimits = response ? trackRateLimits(response) : null;

    res.json({
      success: true,
      data: allGames,
      count: allGames.length,
      api_url: API_BASE_URL,
      demo_mode: allGames.length > 0 && allGames[0].demo,
      rate_limit: rateLimits,
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
    // Extract query parameters for filtering
    const { division, conference } = req.query;
    
    const params = {};
    if (division) params.division = division;
    if (conference) params.conference = conference;
    
    // Check cache first
    if (isCacheValid('teams')) {
      console.log('Serving teams data from cache');
      return res.json({
        success: true,
        data: apiCache.teams.data,
        meta: {},
        api_url: API_BASE_URL,
        from_cache: true
      });
    }

    const response = await fetchWithRetry(
      `${API_BASE_URL}/teams`,
      {
        params,
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    // Update cache
    updateCache('teams', response.data.data);

    res.json({
      success: true,
      data: response.data.data,
      meta: response.data.meta || {},
      api_url: API_BASE_URL
    });
  } catch (error) {
    console.error('Error fetching teams:', error.message);
    
    // If rate limited, provide fallback data
    if (error.response?.status === 429) {
      const teams = [
        { id: 1, abbreviation: "ATL", city: "Atlanta", conference: "East", division: "Southeast", full_name: "Atlanta Hawks", name: "Hawks" },
        { id: 2, abbreviation: "BOS", city: "Boston", conference: "East", division: "Atlantic", full_name: "Boston Celtics", name: "Celtics" },
        // Add more teams if needed
      ];
      
      return res.json({
        success: true,
        data: teams,
        api_url: API_BASE_URL,
        demo_mode: true,
        message: 'Using fallback team data due to API rate limiting'
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch teams',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve team information at this time' 
        : error.message
    });
  }
});

// Route to get a specific team by ID
app.get('/api/teams/:id', validateApiKey, async (req, res) => {
  try {
    const teamId = req.params.id;
    
    const response = await fetchWithRetry(
      `${API_BASE_URL}/teams/${teamId}`,
      {
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json({
      success: true,
      data: response.data.data,
      api_url: API_BASE_URL
    });
  } catch (error) {
    console.error(`Error fetching team ${req.params.id}:`, error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch team details',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve team details at this time' 
        : error.message
    });
  }
});

// Route to search for NBA players
app.get('/api/players', validateApiKey, async (req, res) => {
  try {
    const { search, first_name, last_name, team_ids, page, per_page } = req.query;
    
    const params = {};
    if (search) params.search = search;
    if (first_name) params.first_name = first_name;
    if (last_name) params.last_name = last_name;
    
    // Handle team_ids as array
    if (team_ids) {
      const teamIdsArray = Array.isArray(team_ids) ? team_ids : [team_ids];
      teamIdsArray.forEach((id, index) => {
        params[`team_ids[${index}]`] = id;
      });
    }
    
    // Pagination
    if (per_page) params.per_page = per_page;
    if (page) params.cursor = page;
    
    // Check cache first
    if (isCacheValid('players')) {
      console.log('Serving players data from cache');
      return res.json({
        success: true,
        data: apiCache.players.data,
        meta: {},
        api_url: API_BASE_URL,
        from_cache: true
      });
    }

    const response = await fetchWithRetry(
      `${API_BASE_URL}/players`,
      {
        params,
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    // Update cache
    updateCache('players', response.data.data);

    res.json({
      success: true,
      data: response.data.data,
      meta: response.data.meta || {},
      api_url: API_BASE_URL
    });
  } catch (error) {
    console.error('Error searching players:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to search players',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to search for players at this time' 
        : error.message
    });
  }
});

// Route to get player details by ID
app.get('/api/players/:id', validateApiKey, async (req, res) => {
  try {
    const playerId = req.params.id;
    
    const response = await fetchWithRetry(
      `${API_BASE_URL}/players/${playerId}`,
      {
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    res.json({
      success: true,
      data: response.data.data,
      api_url: API_BASE_URL
    });
  } catch (error) {
    console.error(`Error fetching player ${req.params.id}:`, error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch player details',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve player details at this time' 
        : error.message
    });
  }
});

// Route to get live box scores (available with GOAT tier subscription)
app.get('/api/games/live', validateApiKey, async (req, res) => {
  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/box_scores/live`,
      {
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000 // Longer timeout for detailed data
      }
    );

    res.json({
      success: true,
      data: response.data.data,
      api_url: API_BASE_URL,
      live: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching live box scores:', error.message);
    
    // Handle unauthorized access (account tier limitation)
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'subscription_required',
        message: 'This endpoint requires a higher subscription tier (GOAT tier)'
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch live games',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve live game data at this time' 
        : error.message
    });
  }
});

// Route to get box scores for a specific date (available with GOAT tier subscription)
app.get('/api/games/box_scores', validateApiKey, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'missing_parameter',
        message: 'Date parameter is required (format: YYYY-MM-DD)'
      });
    }
    
    const response = await fetchWithRetry(
      `${API_BASE_URL}/box_scores`,
      {
        params: { date },
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json({
      success: true,
      data: response.data.data,
      api_url: API_BASE_URL,
      date
    });
  } catch (error) {
    console.error(`Error fetching box scores for ${req.query.date}:`, error.message);
    
    // Handle unauthorized access (account tier limitation)
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'subscription_required',
        message: 'This endpoint requires a higher subscription tier (GOAT tier)'
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch box scores',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve box scores at this time' 
        : error.message
    });
  }
});

// Route to get season averages for players (available with GOAT tier subscription)
app.get('/api/players/season_averages', validateApiKey, async (req, res) => {
  try {
    const { season, season_type, type, player_ids } = req.query;
    
    if (!season || !season_type || !type) {
      return res.status(400).json({
        success: false,
        error: 'missing_parameters',
        message: 'Required parameters: season, season_type, and type'
      });
    }
    
    const params = {
      season,
      season_type,
      type
    };
    
    // Handle player_ids as array
    if (player_ids) {
      const playerIdsArray = Array.isArray(player_ids) ? player_ids : [player_ids];
      playerIdsArray.forEach((id, index) => {
        params[`player_ids[${index}]`] = id;
      });
    }
    
    const response = await fetchWithRetry(
      `${API_BASE_URL}/season_averages/general`,
      {
        params,
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json({
      success: true,
      data: response.data.data,
      meta: response.data.meta || {},
      api_url: API_BASE_URL,
      season,
      season_type,
      type
    });
  } catch (error) {
    console.error('Error fetching season averages:', error.message);
    
    // Handle unauthorized access (account tier limitation)
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'subscription_required',
        message: 'This endpoint requires a higher subscription tier (GOAT tier)'
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch season averages',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve season averages at this time' 
        : error.message
    });
  }
});

// Route to get game stats (available with ALL-STAR tier subscription)
app.get('/api/games/stats', validateApiKey, async (req, res) => {
  try {
    const { game_ids, player_ids, seasons, per_page, cursor } = req.query;
    
    const params = {};
    
    // Handle game_ids as array
    if (game_ids) {
      const gameIdsArray = Array.isArray(game_ids) ? game_ids : [game_ids];
      gameIdsArray.forEach((id, index) => {
        params[`game_ids[${index}]`] = id;
      });
    }
    
    // Handle player_ids as array
    if (player_ids) {
      const playerIdsArray = Array.isArray(player_ids) ? player_ids : [player_ids];
      playerIdsArray.forEach((id, index) => {
        params[`player_ids[${index}]`] = id;
      });
    }
    
    // Handle seasons as array
    if (seasons) {
      const seasonsArray = Array.isArray(seasons) ? seasons : [seasons];
      seasonsArray.forEach((season, index) => {
        params[`seasons[${index}]`] = season;
      });
    }
    
    // Pagination
    if (per_page) params.per_page = per_page;
    if (cursor) params.cursor = cursor;
    
    const response = await fetchWithRetry(
      `${API_BASE_URL}/stats`,
      {
        params,
        headers: {
          'Authorization': process.env.API_KEY,
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    res.json({
      success: true,
      data: response.data.data,
      meta: response.data.meta || {},
      api_url: API_BASE_URL
    });
  } catch (error) {
    console.error('Error fetching game stats:', error.message);
    
    // Handle unauthorized access (account tier limitation)
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'subscription_required',
        message: 'This endpoint requires a higher subscription tier (ALL-STAR tier)'
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch game stats',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to retrieve game stats at this time' 
        : error.message
    });
  }
});

// Route to get API rate limit status - useful for free tier users
app.get('/api/rate-limits', validateApiKey, async (req, res) => {
  try {
    // Make a lightweight request to check current rate limits
    const response = await axios.get(`${API_BASE_URL}/teams?per_page=1`, {
      headers: {
        'Authorization': process.env.API_KEY,
        'Accept': 'application/json',
        'User-Agent': 'SportsOrca/1.0'
      },
      timeout: 5000
    });
    
    const limit = response.headers['x-ratelimit-limit'];
    const remaining = response.headers['x-ratelimit-remaining'];
    const reset = response.headers['x-ratelimit-reset'];
    const tier = response.headers['x-subscription-tier'] || 'Free';
    
    res.json({
      success: true,
      rate_limit: {
        limit,
        remaining,
        reset,
        tier
      },
      usage_percentage: limit ? Math.round((1 - (remaining / limit)) * 100) : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking rate limits:', error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'rate_limit_exceeded',
        message: 'Rate limit exceeded. Please try again later.',
        retry_after: error.response.headers['retry-after'] || 60
      });
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to check rate limits',
      message: process.env.NODE_ENV === 'production' 
        ? 'Unable to check API rate limits at this time' 
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

// Global variables for tracking API tier
global.apiTier = null;
global.apiTierLastChecked = 0;
global.rateLimit = null;
