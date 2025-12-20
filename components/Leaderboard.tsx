import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { ArrowLeft, Trophy, Star } from 'lucide-react';
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

  const entriesToShow = serverEntries.length ? serverEntries : localEntries;
  const connectionLabel = connected ? 'Live' : playerName ? 'Offline' : 'Name required';
  const connectionClass = connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500';

  return (
    <div className="min-h-screen bg-[#FFFBEB] p-6 pb-12">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold text-[#6B4F3F]">Top Collectors</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-1 font-semibold tracking-wide ${connectionClass}`}>
                {connectionLabel}
              </span>
              <span className="text-[#6B4F3F]/80">{connected ? 'Streaming live' : 'Waiting for the backend'}</span>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-[#FFD6E8] mb-6">
          <div className="bg-[#FFD6E8] p-6 text-center">
            <Trophy size={48} className="mx-auto text-[#6B4F3F] mb-2" />
            <p className="font-body text-[#6B4F3F] font-bold">Who has the most friends?</p>
          </div>

          <div className="p-4 flex flex-col gap-2">
            {entriesToShow.length === 0 ? (
              <div className="text-center py-8 text-gray-400 font-body">
                No collectors yet. Start playing!
              </div>
            ) : (
              entriesToShow.map((entry, index) => {
                const avatarUrl =
                  profileApiBase && entry.profilePictureKey
                    ? buildProfilePictureUrl(profileApiBase, entry.profilePictureKey)
                    : null;
                return (
                  <div
                    key={`${entry.name}-${index}`}
                    className={`flex items-center p-4 rounded-2xl ${index < 3 ? 'bg-[#FFF9E6] border-2 border-[#FFE9A8]' : 'bg-gray-50'}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-xl mr-4 ${
                        index === 0 ? 'bg-[#FFE9A8] text-[#B48E25]' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-2 border-white bg-white shadow-inner overflow-hidden">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`${entry.name}'s profile`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-[#FFE9A8] text-[0.65rem] font-heading uppercase tracking-[0.3em] text-[#B48E25]">
                            {entry.name?.charAt(0) || '-'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-[#6B4F3F] text-xl">{entry.name}</h3>
                        <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString()}</p>
                        {(entry.giftsSent || entry.giftsReceived) && (
                          <p className="text-[0.65rem] text-[#6B4F3F]/70">
                            {entry.giftsSent ? `${entry.giftsSent} sent` : ''}
                            {entry.giftsSent && entry.giftsReceived ? ' · ' : ''}
                            {entry.giftsReceived ? `${entry.giftsReceived} received` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                      <Star size={16} fill="#FF8FAB" stroke="none" />
                      <span className="font-heading font-bold text-[#6B4F3F]">{entry.count}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border-4 border-[#FFD6E8] shadow-xl p-6 text-center">
          <p className="text-sm text-[#6B4F3F]/80">
            Add your name on the home screen to join the live leaderboard.
          </p>
        </div>
      </div>
    </div>
  );
};
