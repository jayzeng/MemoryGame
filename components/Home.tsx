import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { Play, Book, Trophy, Edit2, Snowflake } from 'lucide-react';
import { storage } from '../utils/storage';
import { MOCK_SQUISHMALLOWS } from '../constants';
import type { Squishmallow } from '../types';
import './Home.css';
import { useHoliday } from './HolidayContext';

const ORBIT_CONFIGS = [
  { radius: 180, size: 80, duration: 12, delay: '0s', borderColor: 'border-[#FFD6E8]/50' },
  { radius: 220, size: 72, duration: 14, delay: '0.4s', borderColor: 'border-[#FF8FAB]/40' },
  { radius: 260, size: 64, duration: 16, delay: '0.8s', borderColor: 'border-[#CFF3E2]/40' },
  { radius: 300, size: 58, duration: 18, delay: '1.2s', borderColor: 'border-[#DCCBFF]/50' },
  { radius: 340, size: 52, duration: 20, delay: '1.6s', borderColor: 'border-[#FFE9A8]/40' },
  { radius: 380, size: 48, duration: 22, delay: '2s', borderColor: 'border-[#9AD6FF]/30' },
];

const HERO_TAGLINE =
  'Collect the fluffiest pals, match their memories, and parade them across the sweetest playground.';

const getRandomSquishmallows = (count: number): Squishmallow[] => {
  const pool = [...MOCK_SQUISHMALLOWS];
  const picks: Squishmallow[] = [];
  while (picks.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const [selected] = pool.splice(index, 1);
    picks.push(selected);
  }
  return picks;
};

export const Home: React.FC = () => {
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [collectedCount, setCollectedCount] = useState(0);
  const [floatingSquishmallows] = useState<Squishmallow[]>(() => getRandomSquishmallows(ORBIT_CONFIGS.length));
  const pauseTimers = useRef<Record<string, number>>({});
  const [pausedOrbitIds, setPausedOrbitIds] = useState<Record<string, boolean>>({});
  const { isHoliday } = useHoliday();

  // Load initial state
  useEffect(() => {
    const storedName = storage.getPlayerName();
    if (storedName) {
      setName(storedName);
    } else {
      setIsEditing(true);
    }
    refreshCount();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(pauseTimers.current).forEach((timer) => {
        if (timer) {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  const refreshCount = () => {
    setCollectedCount(storage.getUnlockedIds().length);
  };

  const handleSaveName = (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    storage.setPlayerName(trimmed);
    setIsEditing(false);

    storage.updateLeaderboard();
    refreshCount();
  };

  const pauseOrbit = (id: string) => {
    setPausedOrbitIds((prev) => ({ ...prev, [id]: true }));
    if (pauseTimers.current[id]) {
      clearTimeout(pauseTimers.current[id]!);
    }
    pauseTimers.current[id] = window.setTimeout(() => {
      setPausedOrbitIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      pauseTimers.current[id] = undefined;
    }, 2000);
  };

  const canPlay = Boolean(name.trim());
  const playLink = !isEditing && canPlay ? '/worlds' : undefined;

  return (
    <div className="relative min-h-screen bg-[#CDEBFF] flex flex-col items-center justify-center p-6 text-center gap-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-hidden">
      <div className="absolute inset-0 z-0">
        {ORBIT_CONFIGS.map((config, index) => {
          const squish = floatingSquishmallows[index];
          if (!squish) return null;
          return (
            <div key={squish.id} className="absolute inset-0 flex items-center justify-center">
              <span
                className={`absolute rounded-full border ${config.borderColor} opacity-30 pointer-events-none`}
                style={{
                  width: `${config.radius * 2}px`,
                  height: `${config.radius * 2}px`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  animation: `orbit ${config.duration}s linear infinite`,
                  animationDelay: config.delay,
                  transformOrigin: '50% 50%',
                  animationPlayState: pausedOrbitIds[squish.id] ? 'paused' : 'running',
                }}
              >
                <div
                  className="absolute top-1/2 left-1/2"
                  style={{ transform: `translate(${config.radius}px, -50%)` }}
                >
                  <div
                    onMouseEnter={() => pauseOrbit(squish.id)}
                    className="flex flex-col items-center gap-1 pointer-events-auto"
                  >
                    <div
                      className="relative rounded-3xl border border-white/80 bg-white/90 shadow-2xl overflow-hidden"
                      style={{ width: `${config.size}px`, height: `${config.size}px` }}
                    >
                      <img
                        src={squish.image}
                        alt={squish.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="font-heading text-[0.65rem] text-[#FF8FAB] drop-shadow-sm">
                      {squish.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-8 w-full">
        <div className="relative flex flex-col items-center gap-5 animate-in slide-in-from-top duration-700">
          <div className="relative z-10 flex flex-col items-center gap-3">
            {isHoliday && (
              <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#B33A3A] shadow-md border border-white">
                <Snowflake size={12} className="text-[#4AA76A]" />
                Happy Holidays
              </div>
            )}
            <div className="relative">
              <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-[#FFD6E8]/90 via-[#FF8FAB]/60 to-transparent opacity-75 blur-2xl" />
              <div className="relative bg-white p-6 rounded-[3rem] shadow-2xl border-4 border-[#FFD6E8] animate-dance origin-center">
                <h1 className="font-heading text-5xl md:text-6xl text-[#6B4F3F] leading-tight">
                  Squishmallow
                  <br />
                  <span className="text-[#FF8FAB]">Memory</span>
                  <br />
                  Parade
                </h1>
              </div>
            </div>
            <p className="max-w-xs px-6 font-body text-sm text-[#6B4F3F]/80 md:text-base">{HERO_TAGLINE}</p>
          </div>
        </div>

        <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border-4 border-white animate-in zoom-in duration-500 animate-float" style={{ animationDelay: '1s' }}>
          <div className="flex flex-col items-center gap-3 mb-4">
            {isEditing ? (
              <form className="flex gap-2 w-full" onSubmit={handleSaveName}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 bg-white border-2 border-[#DCCBFF] rounded-xl px-4 py-2 font-heading text-[#6B4F3F] text-lg focus:outline-none focus:border-[#6B4F3F]"
                  maxLength={12}
                />
                <Button
                  variant="secondary"
                  type="submit"
                  className="rounded-xl px-4 py-2 font-heading uppercase tracking-wide text-xs"
                  disabled={!name.trim()}
                >
                  Save
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                <h2 className="font-heading text-2xl text-[#6B4F3F]">Hi, {name}!</h2>
                <Edit2 size={16} className="opacity-0 group-hover:opacity-50" />
              </div>
            )}
          </div>

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

        <div className="flex flex-col gap-4 w-full max-w-xs animate-in slide-in-from-bottom duration-700 delay-200">
          <Link to="/worlds" className={`w-full ${!playLink ? 'pointer-events-none' : ''}`} aria-disabled={!playLink}>
            <Button
              variant="primary"
              fullWidth
              className="h-20 text-2xl shadow-lg hover:scale-105 transition-transform"
              disabled={!playLink}
            >
              <Play fill="#6B4F3F" className="mr-2" />
              Play
            </Button>
          </Link>

          <div className="flex gap-4">
            <Link to="/book" className="flex-1">
              <Button variant="secondary" fullWidth className="h-16 text-lg hover:scale-105 transition-transform">
                <Book className="mr-2" size={20} />
                Book
              </Button>
            </Link>
            <Link to="/leaderboard" className="flex-1">
              <Button
                variant="secondary"
                fullWidth
                className="h-16 text-lg hover:scale-105 transition-transform bg-[#CFF3E2] border-[#a5e0c5] hover:bg-[#bbf0da]"
              >
                <Trophy className="mr-2" size={20} />
                Top
              </Button>
            </Link>
          </div>
        </div>

        <footer className="fixed bottom-4 text-[#6B4F3F] opacity-50 text-sm font-bold">Safe & Cozy Play • No Ads</footer>
      </div>
    </div>
  );
};
