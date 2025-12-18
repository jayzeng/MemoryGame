import React, { useEffect, useState } from 'react';
import { MOCK_SQUISHMALLOWS } from '../constants';
import { Button } from './Button';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, Heart, Star, Sparkles } from 'lucide-react';
import { storage } from '../utils/storage';

export const ParadeBook: React.FC = () => {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  useEffect(() => {
    setUnlockedIds(storage.getUnlockedIds());
  }, []);

  const collection = MOCK_SQUISHMALLOWS;

  const getRarityIcon = (type: string) => {
    switch (type) {
      case 'ultra-rare':
        return <Sparkles size={16} fill="#DCCBFF" className="text-purple-500" />;
      case 'rare':
        return <Star size={16} fill="#FFE9A8" className="text-orange-400" />;
      case 'classic':
      default:
        return <Heart size={16} fill="#FFD6E8" className="text-pink-400" />;
    }
  };

  const getRarityLabel = (type: string) => {
     switch (type) {
      case 'ultra-rare': return 'Ultra Rare';
      case 'rare': return 'Rare';
      default: return 'Classic';
     }
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] p-6 pb-24">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
            <Link to="/">
                <Button variant="icon">
                    <ArrowLeft size={24} />
                </Button>
            </Link>
            <div className="flex flex-col items-center">
              <h1 className="font-heading text-3xl font-bold text-[#6B4F3F]">Parade Book</h1>
              <span className="font-body text-sm text-[#6B4F3F] opacity-70">
                {unlockedIds.length} / {collection.length} Found
              </span>
            </div>
            <div className="w-12" /> {/* Spacer for balance */}
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {collection.map((squish) => {
                const isUnlocked = unlockedIds.includes(squish.id);
                return (
                  <div key={squish.id} className="flex flex-col items-center gap-2 group">
                      <div className={`relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-lg border-4 transition-transform duration-300 group-hover:scale-[1.03] ${isUnlocked ? 'border-white bg-white' : 'border-[#E6E6E6] bg-[#E6E6E6]'}`}>
                          {isUnlocked ? (
                              <>
                                  <img src={squish.image} alt={squish.name} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 w-full bg-white/90 p-2 text-center backdrop-blur-sm">
                                      <p className="font-heading font-bold text-sm truncate text-[#6B4F3F]">{squish.name}</p>
                                  </div>
                              </>
                          ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                  <Lock size={48} className="mb-2 opacity-50" />
                                  <p className="font-body font-bold text-sm">Locked</p>
                              </div>
                          )}
                          
                          {isUnlocked && (
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/50" title={getRarityLabel(squish.type)}>
                                  {getRarityIcon(squish.type)}
                              </div>
                          )}
                      </div>
                  </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};