import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MatchCard from './MatchCard';

const UpcomingMatches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [apiMessage, setApiMessage] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE_URL}/games/upcoming`);
      
      if (response.data.success) {
        setMatches(response.data.data);
        setDemoMode(response.data.demo_mode || false);
        setApiMessage(response.data.message || '');
      } else {
        throw new Error(response.data.message || 'Failed to fetch matches');
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchMatches();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchMatches, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const handleRetry = () => {
    fetchMatches();
  };

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading upcoming matches...</h2>
        <div className="loading-spinner"></div>
      </div>
    );
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
    );
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
    );
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
  );
};

export default UpcomingMatches;
