import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { Play, Book, Trophy, Edit2, Save } from 'lucide-react';
import { storage } from '../utils/storage';
import { MOCK_SQUISHMALLOWS } from '../constants';

export const Home: React.FC = () => {
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [collectedCount, setCollectedCount] = useState(0);

  // Load initial state
  useEffect(() => {
    const storedName = storage.getPlayerName();
    if (storedName) {
      setName(storedName);
    } else {
      setIsEditing(true);
    }
    // Load collection count for the current (possibly empty) name
    refreshCount();
  }, []);

  const refreshCount = () => {
    setCollectedCount(storage.getUnlockedIds().length);
  };

  const handleSaveName = () => {
    if (name.trim()) {
      storage.setPlayerName(name.trim());
      setIsEditing(false);
      
      // Update data for the new name
      storage.updateLeaderboard(); 
      refreshCount(); // Refresh the count to show THIS user's collection
    }
  };

  return (
    <div className="min-h-screen bg-[#CDEBFF] flex flex-col items-center justify-center p-6 text-center gap-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      
      {/* Logo Area */}
      <div className="flex flex-col items-center gap-4 animate-in slide-in-from-top duration-700">
        <div className="bg-white p-6 rounded-[3rem] shadow-xl border-4 border-[#FFD6E8] animate-dance origin-center">
            <h1 className="font-heading text-5xl md:text-6xl text-[#6B4F3F] leading-tight">
                Squishmallow<br/>
                <span className="text-[#FF8FAB]">Memory</span><br/>
                Parade
            </h1>
        </div>
      </div>

      {/* Player Profile & Stats */}
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-4 border-white animate-in zoom-in duration-500 animate-float" style={{ animationDelay: '1s' }}>
        
        {/* Name Input */}
        <div className="flex flex-col items-center gap-3 mb-4">
          {isEditing ? (
            <div className="flex gap-2 w-full">
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 bg-white border-2 border-[#DCCBFF] rounded-xl px-4 py-2 font-heading text-[#6B4F3F] text-lg focus:outline-none focus:border-[#6B4F3F]"
                maxLength={12}
              />
              <button 
                onClick={handleSaveName}
                className="bg-[#CFF3E2] p-2 rounded-xl text-[#6B4F3F] hover:scale-105 transition-transform"
              >
                <Save size={24} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
              <h2 className="font-heading text-2xl text-[#6B4F3F]">Hi, {name}!</h2>
              <Edit2 size={16} className="opacity-0 group-hover:opacity-50" />
            </div>
          )}
        </div>

        {/* Collection Stats */}
        <div className="bg-[#FFF] rounded-2xl p-4 border-2 border-[#E6E6E6]">
           <p className="font-body text-[#6B4F3F] text-sm uppercase font-bold tracking-wider mb-1">Collection</p>
           <div className="flex items-end justify-center gap-2">
             <span className="font-heading text-4xl text-[#FF8FAB]">{collectedCount}</span>
             <span className="font-heading text-2xl text-gray-400">/ {MOCK_SQUISHMALLOWS.length}</span>
           </div>
           <div className="w-full bg-gray-100 h-3 rounded-full mt-2 overflow-hidden">
             <div 
                className="h-full bg-[#FF8FAB] transition-all duration-1000" 
                style={{ width: `${(collectedCount / MOCK_SQUISHMALLOWS.length) * 100}%` }} 
             />
           </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="flex flex-col gap-4 w-full max-w-xs animate-in slide-in-from-bottom duration-700 delay-200">
        <Link to="/worlds" className="w-full">
            <Button variant="primary" fullWidth className="h-20 text-2xl shadow-lg hover:scale-105 transition-transform" disabled={isEditing || !name}>
               <Play fill="#6B4F3F" className="mr-2"/> Play
            </Button>
        </Link>
        
        <div className="flex gap-4">
          <Link to="/book" className="flex-1">
              <Button variant="secondary" fullWidth className="h-16 text-lg hover:scale-105 transition-transform">
                <Book className="mr-2" size={20}/> Book
              </Button>
          </Link>
          <Link to="/leaderboard" className="flex-1">
              <Button variant="secondary" fullWidth className="h-16 text-lg hover:scale-105 transition-transform bg-[#CFF3E2] border-[#a5e0c5] hover:bg-[#bbf0da]">
                <Trophy className="mr-2" size={20}/> Top
              </Button>
          </Link>
        </div>
      </div>

      {/* Decor */}
      <footer className="fixed bottom-4 text-[#6B4F3F] opacity-50 text-sm font-bold">
        Safe & Cozy Play • No Ads
      </footer>
    </div>
  );
};