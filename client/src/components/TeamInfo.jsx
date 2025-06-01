import React, { useState, useEffect } from 'react';
import apiService from '../services/api.js';
import '../styles/TeamInfo.css';

const TeamInfo = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    conference: '',
    division: ''
  });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTeamDetails, setSelectedTeamDetails] = useState(null);
  const [teamDetailsLoading, setTeamDetailsLoading] = useState(false);

  // Fetch all teams on component mount
  useEffect(() => {
    fetchTeams();
  }, []);

  // Fetch teams with optional filtering
  const fetchTeams = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (filter.conference) params.conference = filter.conference;
      if (filter.division) params.division = filter.division;

      const response = await apiService.getTeams(params);
      
      if (response.success) {
        setTeams(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch teams');
      }
    } catch (error) {
      setError(error.message || 'An error occurred while fetching teams');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters when they change
  useEffect(() => {
    fetchTeams();
  }, [filter]);

  // Fetch details for a selected team
  const fetchTeamDetails = async (teamId) => {
    setTeamDetailsLoading(true);
    
    try {
      const response = await apiService.getTeam(teamId);
      
      if (response.success) {
        setSelectedTeamDetails(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch team details');
      }
    } catch (error) {
      console.error('Error fetching team details:', error);
      // Keep the previous details if there's an error
    } finally {
      setTeamDetailsLoading(false);
    }
  };

  // Handle team selection
  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    fetchTeamDetails(team.id);
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Group teams by conference and division for display
  const groupedTeams = teams.reduce((acc, team) => {
    if (!acc[team.conference]) {
      acc[team.conference] = {};
    }
    
    if (!acc[team.conference][team.division]) {
      acc[team.conference][team.division] = [];
    }
    
    acc[team.conference][team.division].push(team);
    return acc;
  }, {});

  return (
    <div className="team-info-container">
      <h2>NBA Teams</h2>
      
      {/* Filter controls */}
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="conference">Conference:</label>
          <select 
            id="conference" 
            name="conference" 
            value={filter.conference}
            onChange={handleFilterChange}
          >
            <option value="">All Conferences</option>
            <option value="East">Eastern</option>
            <option value="West">Western</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="division">Division:</label>
          <select 
            id="division" 
            name="division" 
            value={filter.division}
            onChange={handleFilterChange}
          >
            <option value="">All Divisions</option>
            <option value="Atlantic">Atlantic</option>
            <option value="Central">Central</option>
            <option value="Southeast">Southeast</option>
            <option value="Northwest">Northwest</option>
            <option value="Pacific">Pacific</option>
            <option value="Southwest">Southwest</option>
          </select>
        </div>
      </div>
      
      {/* Error message */}
      {error && <div className="error-message">{error}</div>}
      
      {/* Loading indicator */}
      {loading ? (
        <div className="loading-indicator">Loading teams...</div>
      ) : (
        <div className="team-grid-container">
          {/* Teams grid */}
          <div className="teams-grid">
            {Object.entries(groupedTeams).map(([conference, divisions]) => (
              <div key={conference} className="conference-section">
                <h3 className="conference-title">{conference}ern Conference</h3>
                
                {Object.entries(divisions).map(([division, divisionTeams]) => (
                  <div key={division} className="division-section">
                    <h4 className="division-title">{division} Division</h4>
                    
                    <div className="division-teams">
                      {divisionTeams.map(team => (
                        <div 
                          key={team.id} 
                          className={`team-card ${selectedTeam?.id === team.id ? 'selected' : ''}`}
                          onClick={() => handleTeamSelect(team)}
                        >
                          <div className="team-logo" style={{ backgroundColor: getTeamColor(team.abbreviation) }}>
                            {team.abbreviation}
                          </div>
                          <div className="team-name">{team.full_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          {/* Selected team details */}
          <div className="team-details-container">
            {selectedTeam ? (
              teamDetailsLoading ? (
                <div className="loading-indicator">Loading team details...</div>
              ) : (
                <div className="team-details">
                  <div className="team-header" style={{ backgroundColor: getTeamColor(selectedTeam.abbreviation) }}>
                    <div className="team-abbreviation">{selectedTeam.abbreviation}</div>
                    <h3 className="team-full-name">{selectedTeam.full_name}</h3>
                  </div>
                  
                  <div className="team-info">
                    <div className="info-row">
                      <span className="info-label">City:</span>
                      <span className="info-value">{selectedTeam.city}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Name:</span>
                      <span className="info-value">{selectedTeam.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Conference:</span>
                      <span className="info-value">{selectedTeam.conference}ern</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Division:</span>
                      <span className="info-value">{selectedTeam.division}</span>
                    </div>
                  </div>
                  
                  {/* This section would show additional stats if available */}
                  <div className="team-stats">
                    <h4>Team Details</h4>
                    <p>Select a different team to view their information.</p>
                  </div>
                </div>
              )
            ) : (
              <div className="no-team-selected">
                <p>Select a team to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get team colors
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

export default TeamInfo;
