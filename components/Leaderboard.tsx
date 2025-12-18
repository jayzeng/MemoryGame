import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { ArrowLeft, Trophy, Star } from 'lucide-react';
import { storage } from '../utils/storage';
import { LeaderboardEntry } from '../types';

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Refresh leaderboard on mount
    storage.updateLeaderboard(); 
    setEntries(storage.getLeaderboard());
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFBEB] p-6 pb-12">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 mb-8">
            <Link to="/">
                <Button variant="icon">
                    <ArrowLeft size={24} />
                </Button>
            </Link>
            <h1 className="font-heading text-3xl font-bold text-[#6B4F3F]">Top Collectors</h1>
        </header>

        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-[#FFD6E8]">
            <div className="bg-[#FFD6E8] p-6 text-center">
                <Trophy size={48} className="mx-auto text-[#6B4F3F] mb-2" />
                <p className="font-body text-[#6B4F3F] font-bold">Who has the most friends?</p>
            </div>

            <div className="p-4 flex flex-col gap-2">
                {entries.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 font-body">
                        No collectors yet. Start playing!
                    </div>
                ) : (
                    entries.map((entry, index) => (
                        <div 
                            key={`${entry.name}-${index}`} 
                            className={`flex items-center p-4 rounded-2xl ${index < 3 ? 'bg-[#FFF9E6] border-2 border-[#FFE9A8]' : 'bg-gray-50'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-xl mr-4 ${index === 0 ? 'bg-[#FFE9A8] text-[#B48E25]' : 'bg-gray-200 text-gray-500'}`}>
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-heading font-bold text-[#6B4F3F] text-xl">{entry.name}</h3>
                                <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                                <Star size={16} fill="#FF8FAB" stroke="none" />
                                <span className="font-heading font-bold text-[#6B4F3F]">{entry.count}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};