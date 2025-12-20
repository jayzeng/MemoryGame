import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MOCK_SQUISHMALLOWS } from '../constants';
import { Button } from './Button';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Lock, Star, Sparkles, Volume2, X } from 'lucide-react';
import { SCORE_UPDATE_EVENT, storage } from '../utils/storage';
import { Squishmallow } from '../types';
import { soundManager } from '../utils/SoundManager';
import { getAgeText } from '../utils/squishmallowHelpers';
import { useMultiplayer } from './MultiplayerProvider';

const INITIAL_RENDER_COUNT = 72;
const LOAD_MORE_BATCH = 48;
const SCROLL_BUFFER_PX = 600;
const SCROLL_TOP_THRESHOLD = 240;

export const ParadeBook: React.FC = () => {
  type FilterOption = 'all' | 'unlocked' | 'locked' | 'rare' | 'ultra-rare' | 'classic';

  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [newGiftedIds, setNewGiftedIds] = useState<string[]>([]);
  const [selectedSquish, setSelectedSquish] = useState<Squishmallow | null>(null);
  const [giftNote, setGiftNote] = useState('');
  const [giftFeedback, setGiftFeedback] = useState<string | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [visibleCount, setVisibleCount] = useState(
    Math.min(INITIAL_RENDER_COUNT, MOCK_SQUISHMALLOWS.length)
  );
  const [filter, setFilter] = useState<FilterOption>('all');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const playerName = storage.getPlayerName();
  const {
    players,
    connected,
    error,
    sendGift: sendGiftToPlayer,
    incomingGift,
    dismissIncomingGift,
  } = useMultiplayer();

  useEffect(() => {
    setUnlockedIds(storage.getUnlockedIds());
  }, []);

  useEffect(() => {
    if (!selectedSquish) return;
    const textToSpeak = selectedSquish.bio || selectedSquish.description || selectedSquish.name;
    soundManager.speak(textToSpeak);
  }, [selectedSquish]);

  const collection = MOCK_SQUISHMALLOWS;
  const totalCount = collection.length;
  const unlockedCount = unlockedIds.length;
  const lockedCount = totalCount - unlockedCount;

  const sortedCollection = useMemo(() => {
    const unlocked = collection.filter((squish) => unlockedIds.includes(squish.id));
    const locked = collection.filter((squish) => !unlockedIds.includes(squish.id));
    return [...unlocked, ...locked];
  }, [collection, unlockedIds]);

  const filteredCollection = useMemo(() => {
    switch (filter) {
      case 'unlocked':
        return sortedCollection.filter((squish) => unlockedIds.includes(squish.id));
      case 'locked':
        return sortedCollection.filter((squish) => !unlockedIds.includes(squish.id));
      case 'rare':
        return sortedCollection.filter((squish) => squish.type === 'rare');
      case 'ultra-rare':
        return sortedCollection.filter((squish) => squish.type === 'ultra-rare');
      case 'classic':
        return sortedCollection.filter(
          (squish) => squish.type !== 'rare' && squish.type !== 'ultra-rare'
        );
      default:
        return sortedCollection;
    }
  }, [filter, sortedCollection, unlockedIds]);

  const visibleCollection = useMemo(
    () => filteredCollection.slice(0, Math.min(visibleCount, filteredCollection.length)),
    [filteredCollection, visibleCount]
  );

  const leaderboardStats = useMemo(() => {
    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const rankIndex = playerName ? sorted.findIndex((player) => player.name === playerName) : -1;
    const playerRank = rankIndex >= 0 ? rankIndex + 1 : null;
    const othersDiscovered = sorted
      .filter((player) => player.name !== playerName)
      .reduce((total, player) => total + (Number.isFinite(player.score) ? player.score : 0), 0);
    return { playerRank, othersDiscovered };
  }, [players, playerName]);

  const recipientOptions = useMemo(
    () =>
      players
        .filter((player) => player.name !== playerName)
        .map((player) => ({
          name: player.name,
          alreadyHasSquish: selectedSquish ? player.unlockedIds?.includes(selectedSquish.id) : false,
        })),
    [players, playerName, selectedSquish]
  );

  const eligibleRecipients = useMemo(
    () => recipientOptions.filter((option) => !option.alreadyHasSquish),
    [recipientOptions]
  );

  const getRarityLabel = (type: string) => {
     switch (type) {
      case 'ultra-rare': return 'Ultra Rare';
      case 'rare': return 'Rare';
      default: return 'Classic';
     }
  };

  const getRarityStarCount = (type: string) => {
    switch (type) {
      case 'ultra-rare':
        return 3;
      case 'rare':
        return 2;
      default:
        return 1;
    }
  };

  const getRarityStyles = (type: string) => {
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

  const closeDetailsModal = useCallback(() => {
    soundManager.stopSpeaking();
    setSelectedSquish(null);
  }, []);

  const handleSelectSquish = useCallback((squish: Squishmallow) => {
    setSelectedSquish(squish);
    setNewGiftedIds((prev) => prev.filter((id) => id !== squish.id));
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedSquish) {
        closeDetailsModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedSquish, closeDetailsModal]);

  useEffect(() => {
    const listener = () => setUnlockedIds(storage.getUnlockedIds());
    window.addEventListener(SCORE_UPDATE_EVENT, listener as EventListener);
    return () => window.removeEventListener(SCORE_UPDATE_EVENT, listener as EventListener);
  }, []);

  useEffect(() => {
    if (!recipientOptions.length || !eligibleRecipients.length) {
      setSelectedRecipient('');
      return;
    }
    setSelectedRecipient((prev) => {
      if (eligibleRecipients.some((option) => option.name === prev)) return prev;
      return eligibleRecipients[0]?.name ?? '';
    });
  }, [recipientOptions, eligibleRecipients]);

  useEffect(() => {
    if (!incomingGift?.squishId) return;
    const received = MOCK_SQUISHMALLOWS.find((squish) => squish.id === incomingGift.squishId);
    if (received) {
      setSelectedSquish(received);
    }
  }, [incomingGift]);

  useEffect(() => {
    let ticking = false;
    const maybeLoadMore = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const nearBottom =
          window.innerHeight + window.scrollY >=
          document.body.offsetHeight - SCROLL_BUFFER_PX;
        if (nearBottom) {
          setVisibleCount((current) =>
            current >= filteredCollection.length
              ? current
              : Math.min(filteredCollection.length, current + LOAD_MORE_BATCH)
          );
        }
        setShowScrollTop((shouldShow) => {
          const scrolledPastThreshold = window.scrollY > SCROLL_TOP_THRESHOLD;
          return shouldShow === scrolledPastThreshold ? shouldShow : scrolledPastThreshold;
        });
        ticking = false;
      });
    };

    maybeLoadMore(); // Kick off initial load based on viewport height.
    window.addEventListener('scroll', maybeLoadMore, { passive: true });
    return () => window.removeEventListener('scroll', maybeLoadMore);
  }, [filteredCollection.length]);

  useEffect(() => {
    setVisibleCount((current) => {
      const next = Math.min(INITIAL_RENDER_COUNT, filteredCollection.length);
      return current === next ? current : next;
    });
  }, [filter, filteredCollection.length]);

  return (
    <div className="min-h-screen bg-[#FFFBEB] p-6 pb-24">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
            <Link to="/">
                <Button variant="icon">
                    <ArrowLeft size={24} />
                </Button>
            </Link>
            <div className="flex flex-col items-center">
              <h1 className="font-heading text-3xl font-bold text-[#6B4F3F]">Parade Book</h1>
              <span className="font-body text-sm text-[#6B4F3F] opacity-70">
                {unlockedCount} / {totalCount} Found
              </span>
            </div>
            <div className="w-12" /> {/* Spacer for balance */}
        </header>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          {([
            { value: 'all', label: 'All' },
            { value: 'unlocked', label: 'Unlocked' },
            { value: 'locked', label: 'Locked' },
            { value: 'rare', label: 'Rare' },
            { value: 'ultra-rare', label: 'Ultra Rare' },
            { value: 'classic', label: 'Classic' },
          ] as const).map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-heading font-bold uppercase tracking-wide border transition-colors ${
                filter === option.value
                  ? 'bg-[#FFD6E8] border-[#ffb3d4] text-[#6B4F3F]'
                  : 'bg-white border-[#E6E6E6] text-[#6B4F3F]/70 hover:text-[#6B4F3F]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-10">
          <section className="bg-white/90 rounded-2xl shadow-sm p-4 border border-white/70 md:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-heading uppercase tracking-wide text-[#6B4F3F]/70">
              <span className="flex items-center gap-2 text-[#6B4F3F] font-bold text-sm">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Unlocked</span>
                {unlockedCount}
              </span>
              <span className="flex items-center gap-2 text-[#6B4F3F] font-bold text-sm">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Locked</span>
                {lockedCount}
              </span>
              <span className="flex items-center gap-2 text-[#6B4F3F] font-bold text-sm">
                <span className="rounded-full bg-gray-50 px-3 py-1 text-gray-600">Total</span>
                {totalCount}
              </span>
            </div>
            <div className="mt-3 h-2 bg-[#E6E6E6] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                style={{ width: `${totalCount ? (unlockedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </section>

          <section className="bg-white/90 rounded-2xl shadow-sm p-4 border border-white/70 flex items-center justify-between gap-3 md:col-span-3">
            <div className="flex flex-col gap-1">
              <p className="text-[0.65rem] uppercase tracking-wide text-[#6B4F3F]/70 font-heading">Your rank</p>
              <p className="font-heading text-xl text-[#6B4F3F]">
                {leaderboardStats.playerRank ? `#${leaderboardStats.playerRank}` : '—'}
              </p>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <p className="text-[0.65rem] uppercase tracking-wide text-[#6B4F3F]/70 font-heading">Others found</p>
              <p className="font-heading text-xl text-[#6B4F3F]">
                {leaderboardStats.othersDiscovered}
              </p>
            </div>
            <span className={`text-[0.65rem] rounded-full px-2.5 py-1 font-heading font-bold uppercase tracking-wide ${connected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </section>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {visibleCollection.map((squish) => {
                const isUnlocked = unlockedIds.includes(squish.id);
                return (
                  <div key={squish.id} className="flex flex-col items-center gap-2 group">
                      <div
                          role={isUnlocked ? 'button' : undefined}
                          tabIndex={isUnlocked ? 0 : undefined}
                          onClick={() => isUnlocked && setSelectedSquish(squish)}
                          onKeyDown={(event) => {
                              if (!isUnlocked) return;
                              if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setSelectedSquish(squish);
                              }
                          }}
                          className={`relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-lg border-4 transition-transform duration-300 group-hover:scale-[1.03] ${isUnlocked ? 'border-white bg-white cursor-pointer' : 'border-[#E6E6E6] bg-[#E6E6E6]'}`}
                      >
                          {isUnlocked ? (
                              <>
                                  <img
                                    src={squish.image}
                                    alt={squish.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute bottom-0 w-full bg-white/90 p-2 text-center backdrop-blur-sm">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-heading font-bold text-sm truncate text-[#6B4F3F]">{squish.name}</p>
                                        <span
                                          className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.65rem] font-heading font-bold uppercase tracking-wide ${getRarityStyles(squish.type).bg} ${getRarityStyles(squish.type).text} ${getRarityStyles(squish.type).border}`}
                                        >
                                          {getRarityLabel(squish.type)}
                                        </span>
                                      </div>
                                  </div>
                              </>
                            ) : (
                              <div className="relative w-full h-full overflow-hidden bg-[#E6E6E6]">
                                <img
                                  src={squish.image}
                                  alt={squish.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="absolute inset-0 h-full w-full object-cover opacity-25"
                                  aria-hidden
                                />
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />
                                <div className="relative flex h-full w-full flex-col items-center justify-center text-gray-600 gap-2 px-2 text-center">
                                  <Lock size={48} className="opacity-70" />
                                  <p className="font-body font-bold text-sm">Locked</p>
                                  <div className="flex items-center justify-center gap-1 text-amber-500">
                                    {Array.from({ length: getRarityStarCount(squish.type) }).map((_, index) => (
                                      <Star key={`${squish.id}-locked-star-${index}`} size={14} fill="#F59E0B" stroke="#F59E0B" />
                                    ))}
                                  </div>
                                  <p className="text-[0.7rem] font-heading font-bold uppercase tracking-wide text-[#6B4F3F]">
                                    {getRarityLabel(squish.type)}
                                  </p>
                                </div>
                              </div>
                          )}
                          
                          {isUnlocked && (
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full shadow-sm border border-white/50" title={getRarityLabel(squish.type)}>
                                  <div className="flex items-center gap-0.5 text-amber-500">
                                    {Array.from({ length: getRarityStarCount(squish.type) }).map((_, index) => (
                                      <Star key={`${squish.id}-star-${index}`} size={12} fill="#FBBF24" stroke="#FBBF24" />
                                    ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
                );
            })}
        </div>
      </div>

      {selectedSquish && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl border-8 border-[#FFE9A8] relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <button
              onClick={closeDetailsModal}
              className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="w-full aspect-square bg-gradient-to-br from-[#FFF0F5] to-white rounded-3xl p-6 flex items-center justify-center shadow-inner">
              <img src={selectedSquish.image} alt={selectedSquish.name} className="w-full h-full object-contain drop-shadow-xl" />
            </div>

            <div className="text-center flex flex-col gap-2">
              <div>
                <h3 className="font-heading text-4xl text-[#6B4F3F] leading-tight">{selectedSquish.name}</h3>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                  {selectedSquish.species && (
                    <span className="bg-[#FFE9A8] text-[#8A6D1F] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                      {selectedSquish.species}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-3 py-1 text-[0.65rem] font-heading font-bold uppercase tracking-wide ${getRarityStyles(selectedSquish.type).bg} ${getRarityStyles(selectedSquish.type).text} ${getRarityStyles(selectedSquish.type).border}`}
                  >
                    {getRarityLabel(selectedSquish.type)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{getAgeText(selectedSquish)}</p>
              </div>

              {selectedSquish.squishdate && (
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                  <Sparkles size={12} /> Born: {selectedSquish.squishdate}
                </p>
              )}

              <div className="bg-[#F8FAFC] p-4 rounded-2xl text-left border-2 border-[#E2E8F0] mt-2">
                <p className="font-body text-[#6B4F3F] text-sm leading-relaxed opacity-90">
                  {selectedSquish.bio || selectedSquish.description}
                </p>
              </div>
            </div>

            {playerName && (
              <div className="bg-white/80 rounded-2xl p-4 border border-[#FFE9A8] shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading text-lg text-[#6B4F3F]">Gift this Squishmallow</h4>
                  <span className={`text-xs ${connected ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {connected ? 'Live' : 'Offline'}
                  </span>
                </div>
                <p className="text-xs text-[#6B4F3F]/70">
                  Choose another collector and send a little kindness. Kind note is optional.
                </p>

                <select
                  value={selectedRecipient}
                  onChange={(event) => setSelectedRecipient(event.target.value)}
                  disabled={!recipientOptions.length || !eligibleRecipients.length}
                  className="border border-[#DCCBFF] rounded-2xl px-4 py-3 font-heading text-sm text-[#6B4F3F] focus:outline-none focus:border-[#6B4F3F]"
                >
                  <option value="">
                    {!recipientOptions.length
                      ? 'No other players yet'
                      : !eligibleRecipients.length
                        ? 'Everyone already has this Squishmallow'
                        : 'Choose a friend'}
                  </option>
                  {recipientOptions.map((option) => (
                    <option key={option.name} value={option.name} disabled={option.alreadyHasSquish}>
                      {option.name}
                      {option.alreadyHasSquish ? ' - Already has this Squish' : ''}
                    </option>
                  ))}
                </select>

                <textarea
                  value={giftNote}
                  onChange={(event) => setGiftNote(event.target.value)}
                  rows={3}
                  placeholder="Say something sweet (optional)"
                  className="border border-[#DCCBFF] rounded-2xl px-4 py-3 font-body text-sm text-[#6B4F3F] focus:outline-none focus:border-[#6B4F3F]"
                />

                <Button
                  variant="primary"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    if (!selectedRecipient) {
                      setGiftFeedback('Pick someone to receive this gift.');
                      return;
                    }
                    if (!connected) {
                      setGiftFeedback('Still connecting—please wait a moment.');
                      return;
                    }
                    const success = sendGiftToPlayer({
                      to: selectedRecipient,
                      message: giftNote.trim(),
                      giftType: 'sparkles',
                      squish: {
                        id: selectedSquish.id,
                        name: selectedSquish.name,
                        image: selectedSquish.image,
                      },
                    });
                    if (!success) {
                      setGiftFeedback('Can’t send right now—try again when the leaderboard reconnects.');
                      return;
                    }
                    setGiftFeedback('Gift sent! ✨');
                    setGiftNote('');
                  }}
                  disabled={!connected || !recipientOptions.length || !eligibleRecipients.length}
                >
                  {connected ? 'Send gift' : 'Waiting for connection'}
                </Button>
                {giftFeedback && <p className="text-xs text-[#6B4F3F]">{giftFeedback}</p>}
                {error && <p className="text-[0.6rem] text-red-500">{error}</p>}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <Button
                variant="icon"
                onClick={() => {
                  const textToSpeak = selectedSquish.bio || selectedSquish.description || selectedSquish.name;
                  soundManager.speak(textToSpeak);
                }}
                aria-label={`Hear more about ${selectedSquish.name}`}
              >
                <Volume2 size={20} />
              </Button>
              <Button variant="secondary" onClick={closeDetailsModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {incomingGift && incomingGift.squishId && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-50 mx-auto sm:mx-0 flex max-w-md sm:max-w-sm flex-col gap-3 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            {incomingGift.squishImage && (
              <img
                src={incomingGift.squishImage}
                alt={incomingGift.squishName ?? 'gifted squishmallow'}
                className="h-12 w-12 rounded-2xl object-cover"
              />
            )}
            <div>
              <p className="font-heading text-sm text-[#6B4F3F] font-bold">
                You received {incomingGift.squishName ?? 'a gift'}!
              </p>
              <p className="text-[0.7rem] text-[#6B4F3F]/70">
                From {incomingGift.from}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#6B4F3F]/70 italic">
            {incomingGift.message || 'Someone in the parade shared a friend.'}
          </p>
          <div className="flex justify-end">
            <Button variant="secondary" className="text-[0.7rem]" onClick={dismissIncomingGift}>
              Thanks!
            </Button>
          </div>
        </div>
      )}
      {showScrollTop && (
        <Button
          variant="primary"
          className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll back to the top"
        >
          <ArrowUp size={18} />
        </Button>
      )}
    </div>
  );
};
