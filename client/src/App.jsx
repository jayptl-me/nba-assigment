import React, { useState } from 'react'
import './App.css'
import UpcomingMatches from './components/UpcomingMatches.jsx'
import Header from './components/Header.jsx'
import PlayerSearch from './components/PlayerSearch.jsx'
import TeamInfo from './components/TeamInfo.jsx'

function App() {
  const [activeTab, setActiveTab] = useState('games');
  
  return (
    <div className="App">
      <Header />
      
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          Upcoming Games
        </button>
        <button 
          className={`tab-button ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          Player Search
        </button>
        <button 
          className={`tab-button ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Team Info
        </button>
      </div>
      
      <main className="main-content">
        {activeTab === 'games' && <UpcomingMatches />}
        {activeTab === 'players' && <PlayerSearch />}
        {activeTab === 'teams' && <TeamInfo />}
      </main>
    </div>
  )
}

export default App
