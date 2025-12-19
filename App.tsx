import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { WorldSelect } from './components/WorldSelect';
import { Game } from './components/Game';
import { ParadeBook } from './components/ParadeBook';
import { Leaderboard } from './components/Leaderboard';
import { Home } from './components/Home';
import { HolidayProvider } from './components/HolidayContext';
import { HolidayDecor } from './components/HolidayDecor';

const App: React.FC = () => {
  return (
    <HolidayProvider>
      <HolidayDecor />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/worlds" element={<WorldSelect />} />
          <Route path="/game/:worldId" element={<Game />} />
          <Route path="/book" element={<ParadeBook />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </Router>
    </HolidayProvider>
  );
};

export default App;
