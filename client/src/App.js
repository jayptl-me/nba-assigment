import React from 'react';
import './App.css';
import UpcomingMatches from './components/UpcomingMatches';
import Header from './components/Header';

function App() {
  return (
    <div className="App">
      <Header />
      <main className="main-content">
        <UpcomingMatches />
      </main>
    </div>
  );
}

export default App;
