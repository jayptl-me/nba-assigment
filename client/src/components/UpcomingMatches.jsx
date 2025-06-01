import React, { useState, useEffect, useCallback } from 'react'
import apiService from '../services/api.js'
import config from '../config/env.js'
import MatchCard from './MatchCard.jsx'

const UpcomingMatches = () => {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [apiMessage, setApiMessage] = useState('')
  const [retryAfter, setRetryAfter] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const maxRetries = 3

  const fetchMatches = useCallback(async () => {
    try {
      if (!isRetrying) {
        setLoading(true)
      }
      setError(null)
      
      const response = await apiService.getUpcomingGames()
      
      if (response.success) {
        setMatches(response.data)
        setDemoMode(response.demo_mode || false)
        setApiMessage(response.message || '')
        setRetryCount(0)
        setIsRetrying(false)
      } else if (response.error === 'rate_limit_exceeded') {
        // Handle rate limit specifically
        const waitTime = response.retryAfter || 60
        setRetryAfter(waitTime)
        
        if (retryCount < maxRetries) {
          setIsRetrying(true)
          setApiMessage(`Rate limit exceeded. Retrying in ${waitTime} seconds...`)
          
          // Auto-retry after the specified time
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
            fetchMatches()
          }, waitTime * 1000)
        } else {
          throw new Error('Rate limit exceeded. Maximum retry attempts reached.')
        }
      } else {
        throw new Error(response.message || 'Failed to fetch matches')
      }
    } catch (err) {
      console.error('Error fetching matches:', err)
      setError(err.message || 'Failed to fetch matches')
      setIsRetrying(false)
    } finally {
      if (!isRetrying) {
        setLoading(false)
      }
    }
  }, [isRetrying, retryCount, maxRetries])

  useEffect(() => {
    fetchMatches()
    
    // Refresh data based on configuration
    const interval = setInterval(fetchMatches, config.features.refreshInterval)
    
    return () => clearInterval(interval)
  }, [fetchMatches])

  const handleRetry = () => {
    fetchMatches()
  }

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading upcoming matches...</h2>
        {isRetrying && (
          <div className="retry-info">
            <p>Rate limit hit. Attempt {retryCount+1}/{maxRetries}</p>
            <p>{apiMessage}</p>
          </div>
        )}
        <div className="loading-spinner" data-testid="loading-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <button className="retry-button" onClick={handleRetry}>
          Try Again
        </button>
        <div className="api-info">
          <h3>API Information</h3>
          <p>Data source: Ball Don't Lie NBA API</p>
          <p>URL: https://api.balldontlie.io/v1</p>
          <p>Note: You need to add your API key to the backend .env file</p>
        </div>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="no-matches">
        <h2>No upcoming matches found</h2>
        <p>Check back later for the latest NBA game schedules!</p>
        <div className="api-info">
          <h3>API Information</h3>
          <p>Data source: Ball Don't Lie NBA API</p>
          <p>URL: https://api.balldontlie.io/v1</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {demoMode && (
        <div className="demo-notice">
          <h3>🔧 Demo Mode</h3>
          <p>{apiMessage}</p>
          <p>The app is working correctly with the Ball Don't Lie NBA API!</p>
        </div>
      )}
      
      <div className="matches-container">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
      
      <div className="api-info">
        <h3>API Information</h3>
        <p>Data source: Ball Don't Lie NBA API</p>
        <p>URL: https://api.balldontlie.io/v1</p>
        <p>Showing {matches.length} {demoMode ? 'demo' : 'upcoming'} matches</p>
        <p>Data refreshes automatically every 5 minutes</p>
        {demoMode && (
          <p style={{color: '#f39c12', fontWeight: 'bold'}}>
            ⚠️ Demo data shown because no live NBA games are currently scheduled
          </p>
        )}
      </div>
    </div>
  )
}

export default UpcomingMatches
