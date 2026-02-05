import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { ArrowLeft, Trophy, Star, Sparkles, X, Gift } from 'lucide-react';
import { storage } from '../utils/storage';
import { buildProfilePictureUrl, getProfileApiBase } from '../utils/profile';
import { LeaderboardEntry, LeaderboardPlayer, Squishmallow } from '../types';
import { useMultiplayer } from './MultiplayerProvider';
import { MOCK_SQUISHMALLOWS } from '../constants';

type DisplayEntry = LeaderboardEntry & {
  giftsSent?: number;
  giftsReceived?: number;
  profilePictureKey?: string;
  unlockedIds?: string[];
};

export const Leaderboard: React.FC = () => {
  const [localEntries, setLocalEntries] = useState<LeaderboardEntry[]>(storage.getLeaderboard());
  const [search, setSearch] = useState('');
  const playerName = storage.getPlayerName();
  const { players, connected, requestGift } = useMultiplayer();
  const profileApiBase = useMemo(() => getProfileApiBase(), []);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [requestSquish, setRequestSquish] = useState<Squishmallow | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);
  const [showOnlyNeeded, setShowOnlyNeeded] = useState(false);

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
    unlockedIds: player.unlockedIds,
  }));

  const entriesToShow: DisplayEntry[] = serverEntries.length ? serverEntries : localEntries;
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entriesToShow;
    return entriesToShow.filter((entry) => entry.name?.toLowerCase().includes(query));
  }, [entriesToShow, search]);
  const connectionLabel = connected ? 'Live' : playerName ? 'Offline' : 'Name required';
  const connectionClass = connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500';

  const squishById = useMemo(() => {
    return new Map(MOCK_SQUISHMALLOWS.map((squish) => [squish.id, squish]));
  }, []);

  const myUnlockedIds = useMemo(() => storage.getUnlockedIds(), [playerName]);
  const myUnlockedSet = useMemo(() => new Set(myUnlockedIds), [myUnlockedIds]);

  const getRarityLabel = (type: Squishmallow['type']) => {
    switch (type) {
      case 'ultra-rare':
        return 'Ultra Rare';
      case 'rare':
        return 'Rare';
      default:
        return 'Classic';
    }
  };

  const getRarityRank = (type: Squishmallow['type']) => {
    switch (type) {
      case 'ultra-rare':
        return 3;
      case 'rare':
        return 2;
      default:
        return 1;
    }
  };

  const getRarityStyles = (type: Squishmallow['type']) => {
    switch (type) {
      case 'ultra-rare':
        return {
          bg: 'bg-[#F3E8FF]',
          text: 'text-[#5B21B6]',
          border: 'border-[#DCCBFF]',
        };
      case 'rare':
        return {
          bg: 'bg-[#FFF4E5]',
          text: 'text-[#B45309]',
          border: 'border-[#FCD34D]',
        };
      default:
        return {
          bg: 'bg-[#FFE4ED]',
          text: 'text-[#BE185D]',
          border: 'border-[#FFB6C9]',
        };
    }
  };

  const selectedPlayer: LeaderboardPlayer | null = useMemo(() => {
    if (!selectedPlayerName) return null;
    return players.find((player) => player.name === selectedPlayerName) ?? null;
  }, [players, selectedPlayerName]);

  const selectedPlayerSquish = useMemo(() => {
    if (!selectedPlayer?.unlockedIds?.length) return [];
    const squishList = selectedPlayer.unlockedIds
      .map((id) => squishById.get(id))
      .filter(Boolean) as Squishmallow[];
    squishList.sort((a, b) => {
      const rarityDelta = getRarityRank(b.type) - getRarityRank(a.type);
      if (rarityDelta) return rarityDelta;
      const neededDelta = Number(!myUnlockedSet.has(b.id)) - Number(!myUnlockedSet.has(a.id));
      if (neededDelta) return neededDelta;
      return a.name.localeCompare(b.name);
    });
    return squishList;
  }, [getRarityRank, myUnlockedSet, selectedPlayer?.unlockedIds, squishById, selectedPlayer?.name]);

  const selectedPlayerSquishToShow = useMemo(() => {
    if (!showOnlyNeeded) return selectedPlayerSquish;
    return selectedPlayerSquish.filter((squish) => !myUnlockedSet.has(squish.id));
  }, [myUnlockedSet, selectedPlayerSquish, showOnlyNeeded]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (requestSquish) {
        setRequestSquish(null);
        setRequestFeedback(null);
        return;
      }
      if (selectedPlayerName) {
        setSelectedPlayerName(null);
        setRequestSquish(null);
        setRequestFeedback(null);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [requestSquish, selectedPlayerName]);

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
                    const canOpenCollection = connected && serverEntries.length > 0 && Boolean(entry.unlockedIds?.length);
                    return (
                      <div
                        key={`${entry.name}-${index}`}
                        role={canOpenCollection ? 'button' : undefined}
                        tabIndex={canOpenCollection ? 0 : undefined}
                        onClick={() => {
                          if (!canOpenCollection) return;
                          setSelectedPlayerName(entry.name);
                          setRequestFeedback(null);
                          setShowOnlyNeeded(false);
                        }}
                        onKeyDown={(event) => {
                          if (!canOpenCollection) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedPlayerName(entry.name);
                            setRequestFeedback(null);
                            setShowOnlyNeeded(false);
                          }
                        }}
                        className={`flex items-center p-5 rounded-[1.5rem] transition-transform hover:scale-[1.02] shadow-sm ${
                          index === 0 ? 'bg-[#FFF9E6] border-2 border-[#FFE9A8]' : 
                          index === 1 ? 'bg-gray-50 border-2 border-gray-100' :
                          index === 2 ? 'bg-[#FDF7FF] border-2 border-[#DCCBFF]' : 'bg-white border-2 border-gray-50'
                        } ${canOpenCollection ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFB3D4]' : ''}`}
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
            {connected
              ? 'Tap a player to peek at their collection and ask for a gift.'
              : 'Add your name and photo on the home screen to join the live collector parade!'}
          </p>
        </div>
      </div>

      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-3xl flex flex-col gap-4 shadow-2xl border-8 border-[#FFE9A8] relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => {
                setSelectedPlayerName(null);
                setRequestSquish(null);
                setRequestFeedback(null);
              }}
              className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors z-10"
              aria-label="Close collection"
            >
              <X size={20} />
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-3xl text-[#6B4F3F] leading-tight">{selectedPlayer.name}</h3>
                <p className="text-xs text-[#6B4F3F]/70 font-bold uppercase tracking-widest">
                  {selectedPlayer.unlockedIds?.length ?? 0} collected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[0.65rem] rounded-full px-3 py-1 font-heading font-bold uppercase tracking-wide ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>

	            {!selectedPlayerSquish.length ? (
	              <div className="rounded-3xl border-2 border-gray-100 bg-gray-50 p-8 text-center">
	                <p className="font-heading text-xl text-gray-300">No collection yet.</p>
	              </div>
	            ) : (
	              <>
	                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-white bg-[#FFFDF3] px-4 py-3">
	                  <div className="flex items-center gap-2">
	                    <button
	                      type="button"
	                      onClick={() => setShowOnlyNeeded(false)}
	                      className={`rounded-full border px-4 py-2 text-xs font-heading font-bold uppercase tracking-wide transition-colors ${
	                        showOnlyNeeded
	                          ? 'bg-white border-gray-200 text-[#6B4F3F]/70 hover:text-[#6B4F3F]'
	                          : 'bg-[#FFD6E8] border-[#FFB3D4] text-[#6B4F3F]'
	                      }`}
	                    >
	                      All
	                    </button>
	                    <button
	                      type="button"
	                      onClick={() => setShowOnlyNeeded(true)}
	                      className={`rounded-full border px-4 py-2 text-xs font-heading font-bold uppercase tracking-wide transition-colors ${
	                        showOnlyNeeded
	                          ? 'bg-[#CFF3E2] border-emerald-200 text-emerald-800'
	                          : 'bg-white border-gray-200 text-[#6B4F3F]/70 hover:text-[#6B4F3F]'
	                      }`}
	                      title="Only show Squishmallows you don’t have yet"
	                    >
	                      I need
	                    </button>
	                  </div>
	                  <div className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-widest text-[#6B4F3F]/60">
	                    <span className="rounded-full bg-white px-3 py-1 border border-gray-100">
	                      You have {myUnlockedIds.length}
	                    </span>
	                    <span className="rounded-full bg-white px-3 py-1 border border-gray-100">
	                      You need {selectedPlayerSquish.filter((squish) => !myUnlockedSet.has(squish.id)).length}
	                    </span>
	                  </div>
	                </div>

	                {!selectedPlayerSquishToShow.length ? (
	                  <div className="rounded-3xl border-2 border-gray-100 bg-gray-50 p-8 text-center">
	                    <p className="font-heading text-xl text-gray-300">Nothing new to find here.</p>
	                    <p className="mt-2 text-xs text-[#6B4F3F]/60">Try another collector.</p>
	                  </div>
	                ) : (
	                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
	                    {selectedPlayerSquishToShow.map((squish) => {
	                      const iNeedIt = !myUnlockedSet.has(squish.id);
	                      const canAsk =
	                        connected && Boolean(playerName.trim()) && selectedPlayer.name !== playerName && iNeedIt;
	                      return (
	                        <button
	                          key={`${selectedPlayer.name}-${squish.id}`}
	                          type="button"
	                          className={`group rounded-3xl border-2 p-3 shadow-sm transition-shadow text-left ${
	                            iNeedIt
	                              ? 'border-emerald-200 bg-emerald-50/60 hover:shadow-md'
	                              : 'border-gray-50 bg-white hover:shadow-md opacity-70'
	                          }`}
	                          onClick={() => {
	                            if (!canAsk) return;
	                            setRequestSquish(squish);
	                            setRequestNote('');
	                            setRequestFeedback(null);
	                          }}
	                          disabled={!canAsk}
	                          title={
	                            !playerName.trim()
	                              ? 'Add your name to ask for gifts'
	                              : selectedPlayer.name === playerName
	                                ? 'That is you'
	                                : !iNeedIt
	                                  ? 'You already have this one'
	                                  : connected
	                                    ? 'Ask for a gift'
	                                    : 'Connect to ask'
	                          }
	                        >
	                          <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#FFF0F5] to-white p-3 flex items-center justify-center shadow-inner border border-white/60">
	                            <img
	                              src={squish.image}
	                              alt={squish.name}
	                              className="w-full h-full object-contain drop-shadow-lg"
	                              loading="lazy"
	                              decoding="async"
	                            />
	                          </div>
	                          <div className="mt-2 flex items-start justify-between gap-2">
	                            <p className="font-heading font-bold text-[#6B4F3F] text-sm leading-tight truncate">{squish.name}</p>
	                            <Gift
	                              size={16}
	                              className={`text-[#FF8FAB] transition-opacity flex-shrink-0 ${
	                                canAsk ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
	                              }`}
	                            />
	                          </div>
	                          <div className="mt-1 flex items-center justify-between gap-2">
	                            <span
	                              className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.6rem] font-heading font-bold uppercase tracking-wide ${getRarityStyles(squish.type).bg} ${getRarityStyles(squish.type).text} ${getRarityStyles(squish.type).border}`}
	                              title={getRarityLabel(squish.type)}
	                            >
	                              {getRarityLabel(squish.type)}
	                            </span>
	                            <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${getRarityRank(squish.type)} star rarity`}>
	                              {Array.from({ length: getRarityRank(squish.type) }).map((_, index) => (
	                                <Star key={`${squish.id}-rarity-${index}`} size={12} fill="#FBBF24" stroke="#FBBF24" />
	                              ))}
	                            </div>
	                          </div>
	                          {!iNeedIt && (
	                            <p className="mt-1 text-[0.55rem] font-bold uppercase tracking-[0.25em] text-[#6B4F3F]/50">
	                              You have it
	                            </p>
	                          )}
	                        </button>
	                      );
	                    })}
	                  </div>
	                )}
	              </>
	            )}
          </div>
        </div>
      )}

      {selectedPlayer && requestSquish && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl border-8 border-[#DCCBFF] relative">
            <button
              onClick={() => {
                setRequestSquish(null);
                setRequestFeedback(null);
              }}
              className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors z-10"
              aria-label="Close request"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-[#FFF0F5] to-white p-3 shadow-inner border border-white/60 flex items-center justify-center">
                <img src={requestSquish.image} alt={requestSquish.name} className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.35em] text-[#6B4F3F]/50 font-bold">Ask to gift</p>
                <h4 className="font-heading text-2xl text-[#6B4F3F] truncate">{requestSquish.name}</h4>
                <p className="text-xs text-[#6B4F3F]/70">
                  Ask {selectedPlayer.name} to share this Squishmallow.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#FFE9A8] bg-[#FFFDF3] px-4 py-3">
              <span className="text-[0.65rem] uppercase tracking-[0.35em] text-[#6B4F3F]/50 font-bold">
                Rarity
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.65rem] font-heading font-bold uppercase tracking-wide ${getRarityStyles(requestSquish.type).bg} ${getRarityStyles(requestSquish.type).text} ${getRarityStyles(requestSquish.type).border}`}
                >
                  {getRarityLabel(requestSquish.type)}
                </span>
                <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${getRarityRank(requestSquish.type)} star rarity`}>
                  {Array.from({ length: getRarityRank(requestSquish.type) }).map((_, index) => (
                    <Star key={`request-${requestSquish.id}-${index}`} size={14} fill="#FBBF24" stroke="#FBBF24" />
                  ))}
                </div>
              </div>
            </div>

            <textarea
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              rows={3}
              placeholder="Say something kind (optional)"
              className="border border-[#DCCBFF] rounded-2xl px-4 py-3 font-body text-sm text-[#6B4F3F] focus:outline-none focus:border-[#6B4F3F]"
            />

            <Button
              variant="primary"
              className="w-full rounded-2xl"
              onClick={() => {
                if (!playerName.trim()) {
                  setRequestFeedback('Add your name first.');
                  return;
                }
                if (myUnlockedSet.has(requestSquish.id)) {
                  setRequestFeedback('You already have this one.');
                  return;
                }
                if (!connected) {
                  setRequestFeedback('Still connecting—please wait a moment.');
                  return;
                }
                const success = requestGift({
                  to: selectedPlayer.name,
                  message: requestNote.trim(),
                  squish: { id: requestSquish.id, name: requestSquish.name, image: requestSquish.image },
                });
                if (!success) {
                  setRequestFeedback('Can’t send right now—try again when the parade reconnects.');
                  return;
                }
                setRequestFeedback('Request sent! ✨');
              }}
              disabled={!connected || !playerName.trim() || selectedPlayer.name === playerName || myUnlockedSet.has(requestSquish.id)}
            >
              Send request
            </Button>
            {requestFeedback && <p className="text-xs text-[#6B4F3F]">{requestFeedback}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
