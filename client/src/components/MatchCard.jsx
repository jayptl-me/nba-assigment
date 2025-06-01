import React from 'react'
import moment from 'moment'

const MatchCard = ({ match }) => {
  const formatDate = (dateString) => {
    return moment(dateString).format('MMMM Do, YYYY')
  }

  const formatTime = (dateString) => {
    return moment(dateString).format('h:mm A')
  }

  const getStatusClass = (status) => {
    if (status === 'Final') {
      return 'status-final'
    } else if (status.includes('Qtr') || status === 'Halftime') {
      return 'status-live'
    } else {
      return 'status-upcoming'
    }
  }

  return (
    <div className={`match-card ${match.demo ? 'demo-card' : ''}`}>
      {match.demo && (
        <div className="demo-badge">DEMO</div>
      )}
      <div className="match-teams">
        <div className="team">
          <div className="team-name">{match.visitor_team.name}</div>
          <div className="team-city">{match.visitor_team.city}</div>
          {match.visitor_team_score !== null && (
            <div className="team-score">{match.visitor_team_score}</div>
          )}
        </div>
        
        <div className="vs-separator">VS</div>
        
        <div className="team">
          <div className="team-name">{match.home_team.name}</div>
          <div className="team-city">{match.home_team.city}</div>
          {match.home_team_score !== null && (
            <div className="team-score">{match.home_team_score}</div>
          )}
        </div>
      </div>
      
      <div className="match-info">
        <div className="match-date">
          📅 {formatDate(match.datetime || match.date)}
        </div>
        
        <div className="match-time">
          🕐 {formatTime(match.datetime || match.date)}
        </div>
        
        <div className={`match-status ${getStatusClass(match.status)}`}>
          {match.status}
        </div>
        
        {match.period > 0 && (
          <div className="match-period">
            Period: {match.period}
          </div>
        )}
        
        {match.time && match.time.trim() && (
          <div className="match-clock">
            Time: {match.time}
          </div>
        )}
      </div>
    </div>
  )
}

export default MatchCard
