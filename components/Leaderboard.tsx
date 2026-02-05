import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { ArrowLeft, Trophy, Star, Sparkles } from 'lucide-react';
import { storage } from '../utils/storage';
import { buildProfilePictureUrl, getProfileApiBase } from '../utils/profile';
import { LeaderboardEntry } from '../types';
import { useMultiplayer } from './MultiplayerProvider';

type DisplayEntry = LeaderboardEntry & {
  giftsSent?: number;
  giftsReceived?: number;
  profilePictureKey?: string;
};

export const Leaderboard: React.FC = () => {
  const [localEntries, setLocalEntries] = useState<LeaderboardEntry[]>(storage.getLeaderboard());
  const [search, setSearch] = useState('');
  const playerName = storage.getPlayerName();
  const { players, connected } = useMultiplayer();
  const profileApiBase = useMemo(() => getProfileApiBase(), []);

  useEffect(() => {
    storage.updateLeaderboard();
    setLocalEntries(storage.getLeaderboard());
  }, []);

  const serverEntries: DisplayEntry[] = players.map((player) => ({
    name: player.name,
    count: player.score,
    date: player.lastUpdated,
    giftsSent: player.giftsSent,
    giftsReceived: player.giftsReceived,
    profilePictureKey: player.profilePictureKey,
  }));

  const entriesToShow: DisplayEntry[] = serverEntries.length ? serverEntries : localEntries;
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entriesToShow;
    return entriesToShow.filter((entry) => entry.name?.toLowerCase().includes(query));
  }, [entriesToShow, search]);
  const connectionLabel = connected ? 'Live' : playerName ? 'Offline' : 'Name required';
  const connectionClass = connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="min-h-screen bg-[#FFFBEB] p-6 pb-12 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-6 mb-8">
          <Link to="/">
            <Button variant="icon" className="hover:scale-110 transition-transform shadow-lg">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-4xl font-bold text-[#6B4F3F] drop-shadow-sm">Top Parade</h1>
            <div className="flex items-center gap-3 mt-1">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest shadow-sm ${connectionClass}`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                {connectionLabel}
              </div>
              <span className="text-[#6B4F3F]/60 text-[0.7rem] font-bold tracking-tight uppercase">{connected ? 'Streaming Live' : 'Offline Mode'}</span>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border-4 border-white mb-8">
          <div className="bg-gradient-to-b from-[#FFD6E8] to-[#FFB3D4] p-8 text-center relative overflow-hidden">
            <Trophy size={64} className="mx-auto text-[#6B4F3F] mb-3 drop-shadow-lg animate-bounce duration-[3000ms]" />
            <p className="font-heading text-2xl text-[#6B4F3F]">Who has the most friends?</p>
            {/* Decorative sparkles */}
            <div className="absolute top-4 left-4 opacity-30"><Sparkles size={24} className="text-white" /></div>
            <div className="absolute bottom-4 right-4 opacity-30"><Sparkles size={24} className="text-white" /></div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            {entriesToShow.length === 0 ? (
              <div className="text-center py-12 text-gray-300 font-heading text-xl">
                No collectors yet. Start playing!
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search players..."
                    className="flex-1 rounded-2xl border-2 border-gray-100 bg-white px-4 py-3 font-body text-sm text-[#6B4F3F] shadow-sm focus:outline-none focus:border-[#FFB3D4]"
                  />
                  <div className="rounded-2xl bg-gray-50 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-widest text-gray-500">
                    {filteredEntries.length} / {entriesToShow.length}
                  </div>
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="text-center py-10 text-gray-300 font-heading text-xl">
                    No matches.
                  </div>
                ) : (
                  filteredEntries.map((entry, index) => {
                    const avatarUrl =
                      profileApiBase && entry.profilePictureKey
                        ? buildProfilePictureUrl(profileApiBase, entry.profilePictureKey)
                        : null;
                    return (
                      <div
                        key={`${entry.name}-${index}`}
                        className={`flex items-center p-5 rounded-[1.5rem] transition-transform hover:scale-[1.02] shadow-sm ${
                          index === 0 ? 'bg-[#FFF9E6] border-2 border-[#FFE9A8]' : 
                          index === 1 ? 'bg-gray-50 border-2 border-gray-100' :
                          index === 2 ? 'bg-[#FDF7FF] border-2 border-[#DCCBFF]' : 'bg-white border-2 border-gray-50'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-heading font-bold text-2xl mr-4 shadow-inner ${
                            index === 0 ? 'bg-[#FFE9A8] text-[#B48E25]' : 
                            index === 1 ? 'bg-gray-200 text-gray-500' :
                            index === 2 ? 'bg-[#DCCBFF] text-[#6B4F3F]' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex-shrink-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={`${entry.name}'s profile`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center bg-[#FFE9A8] text-lg font-heading uppercase tracking-widest text-[#B48E25]">
                                {entry.name?.charAt(0) || '-'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-heading font-bold text-[#6B4F3F] text-2xl leading-tight truncate">{entry.name}</h3>
                            <p className="text-[0.65rem] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{new Date(entry.date).toLocaleDateString()}</p>
                            {(entry.giftsSent || entry.giftsReceived) && (
                              <p className="text-[0.6rem] text-[#6B4F3F]/60 font-bold uppercase tracking-tighter mt-1">
                                {entry.giftsSent ? `${entry.giftsSent} Gifts Sent` : ''}
                                {entry.giftsSent && entry.giftsReceived ? ' · ' : ''}
                                {entry.giftsReceived ? `${entry.giftsReceived} Received` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white px-4 py-2 rounded-2xl shadow-md border-2 border-[#FFD6E8]">
                          <div className="flex items-center gap-1.5">
                            <Star size={18} fill="#FF8FAB" stroke="none" />
                            <span className="font-heading font-bold text-[#6B4F3F] text-2xl">{entry.count}</span>
                          </div>
                          <span className="text-[0.5rem] font-bold uppercase tracking-[0.2em] text-[#FF8FAB]">Pals</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] border-2 border-white shadow-lg p-6 text-center">
          <p className="text-sm text-[#6B4F3F]/70 font-body leading-relaxed">
            Add your name and photo on the home screen to join the live collector parade!
          </p>
        </div>
      </div>
    </div>
  );
};
