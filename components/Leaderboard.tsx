import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { ArrowLeft, Trophy, Star } from 'lucide-react';
import { storage } from '../utils/storage';
import { buildProfilePictureUrl, getProfileApiBase } from '../utils/profile';
import { LeaderboardEntry } from '../types';
import { useMultiplayer } from './MultiplayerProvider';

const GIFT_TYPES = [
  { value: 'sparkles', label: 'Sparkle dust' },
  { value: 'hugs', label: 'Warm hugs' },
  { value: 'cookies', label: 'Cozy cookies' },
];

type DisplayEntry = LeaderboardEntry & {
  giftsSent?: number;
  giftsReceived?: number;
  profilePictureKey?: string;
};

export const Leaderboard: React.FC = () => {
  const [localEntries, setLocalEntries] = useState<LeaderboardEntry[]>(storage.getLeaderboard());
  const [giftMessage, setGiftMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [giftType, setGiftType] = useState(GIFT_TYPES[0].value);
  const [giftFeedback, setGiftFeedback] = useState<string | null>(null);
  const playerName = storage.getPlayerName();
  const { players, gifts, connected, error, sendGift } = useMultiplayer();
  const profileApiBase = useMemo(() => getProfileApiBase(), []);

  useEffect(() => {
    storage.updateLeaderboard();
    setLocalEntries(storage.getLeaderboard());
  }, []);

  const recipientCandidates = useMemo(() => {
    if (!playerName) return players;
    return players.filter((player) => player.name !== playerName);
  }, [players, playerName]);

  useEffect(() => {
    if (!recipientCandidates.length) {
      setSelectedRecipient('');
      return;
    }
    setSelectedRecipient((prev) =>
      recipientCandidates.some((player) => player.name === prev)
        ? prev
        : recipientCandidates[0]?.name || ''
    );
  }, [recipientCandidates]);

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

  const handleSendGift = () => {
    if (!selectedRecipient || !giftMessage.trim()) {
      setGiftFeedback('Pick a recipient and write a note to send a gift.');
      return;
    }
    if (!sendGift({ to: selectedRecipient, message: giftMessage.trim(), giftType })) {
      setGiftFeedback('Unable to send right now—try again after reconnecting.');
      return;
    }
    setGiftFeedback('Gift sent! ✨');
    setGiftMessage('');
  };

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

        {playerName ? (
          <div className="bg-white rounded-[2rem] border-4 border-[#FFD6E8] shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-heading text-xl text-[#6B4F3F]">Send a gift</h2>
                <p className="text-xs text-[#6B4F3F]/70">Celebrate another collector with a little sparkle.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <select
                value={selectedRecipient}
                onChange={(event) => setSelectedRecipient(event.target.value)}
                disabled={!recipientCandidates.length}
                className="border border-[#DCCBFF] rounded-2xl px-4 py-3 font-heading text-sm text-[#6B4F3F] focus:outline-none focus:border-[#6B4F3F]"
              >
                {recipientCandidates.length === 0 ? (
                  <option value="">Waiting for another collector</option>
                ) : (
                  recipientCandidates.map((player) => (
                    <option key={player.name} value={player.name}>
                      {player.name}
                    </option>
                  ))
                )}
              </select>

              <div className="grid grid-cols-3 gap-2">
                {GIFT_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGiftType(option.value)}
                    className={`rounded-2xl border px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wide ${
                      giftType === option.value
                        ? 'border-[#FF8FAB] bg-[#FF8FAB]/20 text-[#6B4F3F]'
                        : 'border-[#FFE9A8] bg-white text-[#B48E25]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <textarea
                value={giftMessage}
                onChange={(event) => setGiftMessage(event.target.value)}
                rows={3}
                placeholder="Write a kind note"
                className="border border-[#DCCBFF] rounded-2xl px-4 py-3 font-body text-sm text-[#6B4F3F] focus:outline-none focus:border-[#6B4F3F]"
              />

              <Button
                variant="primary"
                className="w-full rounded-2xl"
                onClick={handleSendGift}
                disabled={!connected || !players.length}
              >
                {connected ? 'Send gift' : 'Waiting for connection'}
              </Button>

              {giftFeedback && <p className="text-xs text-[#6B4F3F]">{giftFeedback}</p>}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border-4 border-[#FFD6E8] shadow-xl p-6 mb-6">
            <p className="text-sm text-[#6B4F3F]/80">
              Add your name on the home screen to join the live leaderboard and gifting stream.
            </p>
          </div>
        )}

        <div className="bg-white rounded-[2rem] border-4 border-[#FFD6E8] shadow-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-heading text-lg text-[#6B4F3F]">Gift stream</h3>
              <p className="text-xs text-[#6B4F3F]/70">Recent thoughtful messages from the parade</p>
            </div>
            {error && <p className="text-[0.65rem] text-red-500">{error}</p>}
          </div>

          <div className="flex flex-col gap-3">
            {gifts.length === 0 ? (
              <p className="text-sm text-gray-400">Gifts will appear here as they arrive.</p>
            ) : (
              gifts.map((gift) => (
                <div key={gift.id} className="border border-[#FFD6E8]/70 rounded-2xl p-3 bg-[#FFF9FB]">
                  <p className="text-sm font-heading text-[#6B4F3F]">
                    {gift.from} gifted {gift.to}
                  </p>
                  <p className="text-xs text-[#6B4F3F]/70">{gift.type}</p>
                  <p className="font-body text-sm italic text-[#6B4F3F]/80">“{gift.message}”</p>
                  <p className="text-[0.6rem] text-[#6B4F3F]/50">
                    {new Date(gift.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
