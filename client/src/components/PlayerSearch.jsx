import React, { useState, useEffect } from 'react';
import apiService from '../services/api.js';
import '../styles/PlayerSearch.css';

const PlayerSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teams, setTeams] = useState([]);
  const [noResults, setNoResults] = useState(false);
  const [page, setPage] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Fetch teams for the team filter dropdown
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await apiService.getTeams();
        if (response.success) {
          setTeams(response.data);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, []);

  // Handle search when user submits the form
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery && !selectedTeam) {
      setError('Please enter a search query or select a team');
      return;
    }
    
    setLoading(true);
    setError(null);
    setNoResults(false);
    setPage(null);
    
    try {
      const params = {};
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (selectedTeam) {
        params.team_ids = [selectedTeam];
      }
      
      params.per_page = 12; // Reasonable number for display
      
      const response = await apiService.searchPlayers(params);
      
      if (response.success) {
        setPlayers(response.data);
        setNoResults(response.data.length === 0);
        setHasMore(response.meta && response.meta.next_cursor);
        if (response.meta && response.meta.next_cursor) {
          setPage(response.meta.next_cursor);
        }
      } else {
        throw new Error(response.message || 'Failed to search players');
      }
    } catch (error) {
      setError(error.message || 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  // Load more results when user clicks the "Load More" button
  const handleLoadMore = async () => {
    if (!page) return;
    
    setLoading(true);
    
    try {
      const params = {};
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (selectedTeam) {
        params.team_ids = [selectedTeam];
      }
      
      params.per_page = 12;
      params.page = page;
      
      const response = await apiService.searchPlayers(params);
      
      if (response.success) {
        setPlayers([...players, ...response.data]);
        setHasMore(response.meta && response.meta.next_cursor);
        if (response.meta && response.meta.next_cursor) {
          setPage(response.meta.next_cursor);
        } else {
          setPage(null);
        }
      } else {
        throw new Error(response.message || 'Failed to load more players');
      }
    } catch (error) {
      setError(error.message || 'An error occurred while loading more results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="player-search-container">
      <h2>NBA Player Search</h2>
      
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search for players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="team-select"
          >
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.full_name}
              </option>
            ))}
          </select>
          
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </form>
      
      {noResults && (
        <div className="no-results">
          No players found. Try a different search query or team filter.
        </div>
      )}
      
      <div className="players-grid">
        {players.map(player => (
          <div key={player.id} className="player-card">
            <div className="player-header">
              <h3>{player.first_name} {player.last_name}</h3>
              <span className="player-position">{player.position || 'N/A'}</span>
            </div>
            
            <div className="player-details">
              <p><strong>Team:</strong> {player.team ? player.team.full_name : 'N/A'}</p>
              <p><strong>Height:</strong> {player.height || 'N/A'}</p>
              <p><strong>Weight:</strong> {player.weight ? `${player.weight} lbs` : 'N/A'}</p>
              <p><strong>Jersey:</strong> {player.jersey_number || 'N/A'}</p>
              <p><strong>College:</strong> {player.college || 'N/A'}</p>
              <p><strong>Country:</strong> {player.country || 'N/A'}</p>
            </div>
            
            {player.team && (
              <div className="team-badge" style={{
                backgroundColor: getTeamColor(player.team.abbreviation)
              }}>
                {player.team.abbreviation}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {hasMore && (
        <div className="load-more-container">
          <button 
            onClick={handleLoadMore} 
            className="load-more-button"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More Players'}
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to get team colors (simplified version)
function getTeamColor(abbreviation) {
  const teamColors = {
    'ATL': '#E03A3E',
    'BOS': '#007A33',
    'BKN': '#000000',
    'CHA': '#1D1160',
    'CHI': '#CE1141',
    'CLE': '#860038',
    'DAL': '#00538C',
    'DEN': '#0E2240',
    'DET': '#C8102E',
    'GSW': '#1D428A',
    'HOU': '#CE1141',
    'IND': '#002D62',
    'LAC': '#C8102E',
    'LAL': '#552583',
    'MEM': '#5D76A9',
    'MIA': '#98002E',
    'MIL': '#00471B',
    'MIN': '#0C2340',
    'NOP': '#0C2340',
    'NYK': '#006BB6',
    'OKC': '#007AC1',
    'ORL': '#0077C0',
    'PHI': '#006BB6',
    'PHX': '#1D1160',
    'POR': '#E03A3E',
    'SAC': '#5A2D81',
    'SAS': '#C4CED4',
    'TOR': '#CE1141',
    'UTA': '#002B5C',
    'WAS': '#002B5C'
  };
  
  return teamColors[abbreviation] || '#777777';
}

export default PlayerSearch;
