// API service optimized for Vite
import axios from 'axios'
import config from '../config/env.js'

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Retry configuration
const MAX_RETRIES = config.api.retryAttempts || 3
const INITIAL_RETRY_DELAY = config.api.retryDelay || 1000

// Request interceptor for logging in development
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    return config
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('❌ API Request Error:', error)
    }
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    }
    return response
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('❌ API Response Error:', error.response?.status, error.message)
    }
    
    // Handle common error scenarios
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limit exceeded. Implementing backoff strategy.')
    }
    
    return Promise.reject(error)
  }
)

// Client-side cache
const clientCache = {
  data: {},
  set: (key, data, ttl = 5 * 60 * 1000) => { // Default 5 minutes TTL
    clientCache.data[key] = {
      data,
      expires: Date.now() + ttl,
      timestamp: Date.now()
    }
    // Store in localStorage for persistence between page loads
    try {
      localStorage.setItem(`api_cache_${key}`, JSON.stringify({
        data,
        expires: Date.now() + ttl,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.warn('Failed to store cache in localStorage:', e)
    }
  },
  get: (key) => {
    // Try memory cache first
    const cachedItem = clientCache.data[key]
    if (cachedItem && cachedItem.expires > Date.now()) {
      return { ...cachedItem, fromCache: true }
    }
    
    // Try localStorage as fallback
    try {
      const storedItem = localStorage.getItem(`api_cache_${key}`)
      if (storedItem) {
        const parsed = JSON.parse(storedItem)
        if (parsed.expires > Date.now()) {
          // Restore to memory cache
          clientCache.data[key] = parsed
          return { ...parsed, fromCache: true }
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve cache from localStorage:', e)
    }
    
    return null
  },
  clear: (key) => {
    if (key) {
      delete clientCache.data[key]
      try {
        localStorage.removeItem(`api_cache_${key}`)
      } catch (e) {
        console.warn('Failed to remove item from localStorage:', e)
      }
    } else {
      clientCache.data = {}
      try {
        // Only clear our cache keys, not all localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('api_cache_')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.warn('Failed to clear localStorage cache:', e)
      }
    }
  }
}

// API service methods
export const apiService = {
  // Retry mechanism with exponential backoff
  async retryRequest(requestFn, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
    try {
      return await requestFn()
    } catch (error) {
      if (error.response?.status === 429 && retries > 0) {
        console.warn(`Rate limit exceeded. Retrying in ${delay}ms... (${retries} retries left)`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.retryRequest(requestFn, retries - 1, delay * 2) // Exponential backoff
      }
      throw error
    }
  },
  
  // Get upcoming NBA games
  async getUpcomingGames() {
    try {
      // Check cache first
      const cached = clientCache.get('upcoming_games')
      if (cached) {
        console.log('Cache hit for upcoming games')
        return cached.data
      }
      
      // Use retry mechanism
      const response = await this.retryRequest(
        () => apiClient.get('/games/upcoming')
      )
      clientCache.set('upcoming_games', response.data)
      return response.data
    } catch (error) {
      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'rate_limit_exceeded',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: error.response.headers['retry-after'] || 60
        }
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch upcoming games')
    }
  },
  
  // Get all NBA teams
  async getTeams(params = {}) {
    try {
      // Check cache first
      const cached = clientCache.get('all_teams')
      if (cached) {
        console.log('Cache hit for all teams')
        return cached.data
      }
      
      // Use retry mechanism
      const response = await this.retryRequest(
        () => apiClient.get('/teams', { params })
      )
      clientCache.set('all_teams', response.data)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch teams')
    }
  },
  
  // Get a specific team by ID
  async getTeam(teamId) {
    try {
      const response = await this.retryRequest(
        () => apiClient.get(`/teams/${teamId}`)
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch team details')
    }
  },
  
  // Search for NBA players
  async searchPlayers(params = {}) {
    try {
      const response = await this.retryRequest(
        () => apiClient.get('/players', { params })
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search players')
    }
  },
  
  // Get player details by ID
  async getPlayer(playerId) {
    try {
      const response = await this.retryRequest(
        () => apiClient.get(`/players/${playerId}`)
      )
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch player details')
    }
  },
  
  // Get live game data (GOAT tier subscription)
  async getLiveGames() {
    try {
      const response = await this.retryRequest(
        () => apiClient.get('/games/live')
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'subscription_required',
          message: 'This feature requires a higher subscription tier'
        }
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch live games')
    }
  },
  
  // Get box scores for a specific date (GOAT tier subscription)
  async getBoxScores(date) {
    try {
      const response = await this.retryRequest(
        () => apiClient.get('/games/box_scores', { params: { date } })
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'subscription_required',
          message: 'This feature requires a higher subscription tier'
        }
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch box scores')
    }
  },
  
  // Get season averages for players (GOAT tier subscription)
  async getSeasonAverages(params = {}) {
    try {
      const response = await this.retryRequest(
        () => apiClient.get('/players/season_averages', { params })
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'subscription_required',
          message: 'This feature requires a higher subscription tier'
        }
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch season averages')
    }
  },
  
  // Get game stats (ALL-STAR tier subscription)
  async getGameStats(params = {}) {
    try {
      const response = await this.retryRequest(
        () => apiClient.get('/games/stats', { params })
      )
      return response.data
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'subscription_required',
          message: 'This feature requires a higher subscription tier'
        }
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch game stats')
    }
  },
  
  // Health check
  async healthCheck() {
    try {
      const response = await apiClient.get('/health')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Health check failed')
    }
  }
}

export default apiService
