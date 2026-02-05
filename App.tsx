import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { WorldSelect } from './components/WorldSelect';
import { Game } from './components/Game';
import { ParadeBook } from './components/ParadeBook';
import { Leaderboard } from './components/Leaderboard';
import { Home } from './components/Home';
import { HolidayProvider } from './components/HolidayContext';
import { HolidayDecor } from './components/HolidayDecor';
import { MultiplayerProvider } from './components/MultiplayerProvider';
import { ParentModeProvider } from './components/ParentModeContext';
import { SparkleModeProvider } from './components/SparkleModeContext';
import { SparkleDecor } from './components/SparkleDecor';

const App: React.FC = () => {
  return (
    <ParentModeProvider>
      <SparkleModeProvider>
        <SparkleDecor />
        <HolidayProvider>
          <HolidayDecor />
          <MultiplayerProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/worlds" element={<WorldSelect />} />
                <Route path="/game/:worldId" element={<Game />} />
                <Route path="/book" element={<ParadeBook />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
              </Routes>
            </Router>
          </MultiplayerProvider>
        </HolidayProvider>
      </SparkleModeProvider>
    </ParentModeProvider>
  );
};

export default App;
