import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CardItem, GameState, Squishmallow } from '../types';
import { MOCK_SQUISHMALLOWS, WORLDS } from '../constants';
import { Card } from './Card';
import { Button } from './Button';
import { Pause, Star, Home, RotateCw, Play, Volume2, Sparkles, X, Info } from 'lucide-react';
import ReactConfetti from 'react-confetti';
import { soundManager } from '../utils/SoundManager';
import { storage } from '../utils/storage';
import { getAgeText } from '../utils/squishmallowHelpers';
import { useHoliday } from './HolidayContext';

// Helper to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getColumnOptions = (count: number): number[] => {
  if (count <= 12) return [3, 4];
  if (count <= 16) return [4];
  if (count <= 24) return [4, 6];
  if (count <= 32) return [4, 7];
  return [5, 8];
};

const getChebyshevDistance = (indexA: number, indexB: number, columns: number) => {
  const rowA = Math.floor(indexA / columns);
  const colA = indexA % columns;
  const rowB = Math.floor(indexB / columns);
  const colB = indexB % columns;
  return Math.max(Math.abs(rowA - rowB), Math.abs(colA - colB));
};

const getMinPairDistance = (indexA: number, indexB: number, columnOptions: number[]) =>
  Math.min(...columnOptions.map(columns => getChebyshevDistance(indexA, indexB, columns)));

const scoreDeckSpread = (deck: CardItem[], columnOptions: number[]) => {
  const positions = new Map<string, number[]>();

  deck.forEach((card, index) => {
    const list = positions.get(card.characterId) ?? [];
    list.push(index);
    positions.set(card.characterId, list);
  });

  let adjacentPairs = 0;
  let distanceSum = 0;

  positions.forEach(indices => {
    if (indices.length < 2) return;
    const [first, second] = indices;
    const minDistance = getMinPairDistance(first, second, columnOptions);
    distanceSum += minDistance;
    if (minDistance <= 1) adjacentPairs += 1;
  });

  return { adjacentPairs, distanceSum };
};

const shuffleWithSpread = (deck: CardItem[], columnOptions: number[]) => {
  const attempts = Math.max(40, deck.length * 3);
  let best = shuffle(deck);
  let bestScore = scoreDeckSpread(best, columnOptions);

  for (let i = 0; i < attempts; i += 1) {
    const candidate = shuffle(deck);
    const score = scoreDeckSpread(candidate, columnOptions);

    if (
      score.adjacentPairs < bestScore.adjacentPairs ||
      (score.adjacentPairs === bestScore.adjacentPairs &&
        score.distanceSum > bestScore.distanceSum)
    ) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
};

type LearningEvent = {
  type: 'match' | 'mismatch';
  word: string;
  letters: string[];
  hint: string;
  sentence: string;
  image?: string;
};

const getSpellingLetters = (word: string) => {
  const normalized = word.replace(/[^A-Za-z]/g, '');
  if (normalized.length > 0) return normalized.split('');
  return Array.from(word);
};

const buildLearningEvent = (
  squishmallow: Squishmallow,
  type: LearningEvent['type'],
  related?: Squishmallow
): LearningEvent => {
  const letters = getSpellingLetters(squishmallow.name);
  const firstLetter = letters[0] ?? squishmallow.name[0] ?? '';
  const lastLetter = letters[letters.length - 1] ?? squishmallow.name.slice(-1);

  const hint =
    type === 'match'
      ? `Great job! ${squishmallow.name} has ${letters.length} letter${
          letters.length === 1 ? '' : 's'
        } and starts with ${firstLetter}.`
      : `Try again! ${squishmallow.name} ends with ${lastLetter} and has ${letters.length} letters. Say each letter out loud.`;

  const sentence =
    type === 'match'
      ? squishmallow.bio
        ? `"${squishmallow.bio}"`
        : `You just found ${squishmallow.name}!`
      : related
      ? `${related.name} was the other card; notice how ${squishmallow.name} sounds different.`
      : squishmallow.description || `Spell ${squishmallow.name} slowly to remember it.`;

  return {
    type,
    word: squishmallow.name,
    letters,
    hint,
    sentence,
    image: squishmallow.image,
  };
};

export const Game: React.FC = () => {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { isHoliday } = useHoliday();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Squishmallow[]>([]);
  const [selectedSquish, setSelectedSquish] = useState<Squishmallow | null>(null);
  const [reviewQueue, setReviewQueue] = useState<LearningEvent[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const shouldShowReview =
    gameState === GameState.COMPLETED &&
    reviewQueue.length > 0 &&
    currentReviewIndex < reviewQueue.length;
  const currentReviewEvent = shouldShowReview ? reviewQueue[currentReviewIndex] : null;
  const closeSelectedSquish = useCallback(() => {
    soundManager.stopSpeaking();
    setSelectedSquish(null);
  }, []);

  // Initialize Game
  useEffect(() => {
    initializeGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId]);

  const initializeGame = () => {
    // Determine grid size based on world
    const worldIndex = WORLDS.findIndex(w => w.id === worldId) || 0;
    
    // Scale difficulty:
    // World 1: 8 pairs (16 cards) - Standard
    // World 2: 14 pairs (28 cards) - Medium
    // World 3: 20 pairs (40 cards) - Large
    let pairCount = 8;
    if (worldIndex === 1) pairCount = 14;
    if (worldIndex >= 2) pairCount = 20;
    
    // Select random Squishmallows unique to this run
    const selectedChars = shuffle(MOCK_SQUISHMALLOWS).slice(0, pairCount);
    
    // Create pairs
    const deck: CardItem[] = [];
    selectedChars.forEach(char => {
      // Card 1
      deck.push({ id: `${char.id}-a`, characterId: char.id, isFlipped: false, isMatched: false });
      // Card 2
      deck.push({ id: `${char.id}-b`, characterId: char.id, isFlipped: false, isMatched: false });
    });

    const columnOptions = getColumnOptions(deck.length);
    setCards(shuffleWithSpread(deck, columnOptions));
    setFlippedIds([]);
    setMatchedIds([]);
    setNewlyUnlocked([]);
    setMoves(0);
    setGameState(GameState.PLAYING);
    setShowConfetti(false);
    setIsPaused(false);
    setSelectedSquish(null);
    setReviewQueue([]);
    setCurrentReviewIndex(0);
  };

  const getSquishmallow = (charId: string) => MOCK_SQUISHMALLOWS.find(s => s.id === charId)!;

  // Check for matches
  useEffect(() => {
    if (flippedIds.length === 2) {
      const [id1, id2] = flippedIds;
      const card1 = cards.find(c => c.id === id1);
      const card2 = cards.find(c => c.id === id2);

      if (card1 && card2) {
        if (card1.characterId === card2.characterId) {
          // Match!
          soundManager.playMatch();
          
          // Audio reinforcement for the word
          const name = getSquishmallow(card1.characterId).name;
          setTimeout(() => {
            soundManager.speak(name);
          }, 300);

          // Unlock logic
          const isNew = !storage.isUnlocked(card1.characterId);
          storage.unlockSquishmallow(card1.characterId);
          
          if (isNew) {
              const char = getSquishmallow(card1.characterId);
              // Avoid duplicates in the new list if matched twice
              setNewlyUnlocked(prev => {
                  if (prev.some(p => p.id === char.id)) return prev;
                  return [...prev, char];
              });
          }
          const matchedSquish = getSquishmallow(card1.characterId);
          const reviewEvent = buildLearningEvent(matchedSquish, 'match');
          setReviewQueue(prev =>
            prev.some(event => event.word === reviewEvent.word) ? prev : [...prev, reviewEvent]
          );

          setMatchedIds(prev => [...prev, id1, id2]);
          setCards(prev => prev.map(c => (c.id === id1 || c.id === id2) ? { ...c, isMatched: true } : c));
          setFlippedIds([]);
        } else {
          // No match, flip back after delay
          soundManager.playMismatch();
          const timer = setTimeout(() => {
            setCards(prev => prev.map(c => (c.id === id1 || c.id === id2) ? { ...c, isFlipped: false } : c));
            setFlippedIds([]);
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [flippedIds, cards]);

  // Check for Win
  useEffect(() => {
    if (cards.length > 0 && matchedIds.length === cards.length) {
      setGameState(GameState.COMPLETED);
      soundManager.playWin();
      setShowConfetti(true);
      // Update leaderboard on win
      storage.updateLeaderboard();
      
      // If we found new friends, congratulate specifically
      if (newlyUnlocked.length > 0) {
        setTimeout(() => {
            soundManager.speak(`Wow! You found ${newlyUnlocked.length} new friends!`);
        }, 1500);
      } else {
        setTimeout(() => {
            soundManager.speak("Great job! You finished the parade!");
        }, 1500);
      }
    }
  }, [matchedIds, cards, newlyUnlocked]);

  useEffect(() => {
    if (!selectedSquish) return;
    const textToSpeak = selectedSquish.bio || selectedSquish.description || selectedSquish.name;
    soundManager.speak(textToSpeak);
  }, [selectedSquish]);

  useEffect(() => {
    if (!shouldShowReview || !currentReviewEvent) return;
    soundManager.speak(currentReviewEvent.sentence);
  }, [shouldShowReview, currentReviewEvent]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedSquish) {
        closeSelectedSquish();
        return;
      }
      if (isPaused) {
        setIsPaused(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedSquish, isPaused, closeSelectedSquish]);

  const handleCardClick = (id: string) => {
    if (flippedIds.length >= 2 || isPaused || gameState !== GameState.PLAYING) return;
    
    soundManager.playFlip();
    
    // Find card and speak name
    const card = cards.find(c => c.id === id);
    if (card) {
      const name = getSquishmallow(card.characterId).name;
      soundManager.speak(name);
    }

    setCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));
    setFlippedIds(prev => [...prev, id]);
    setMoves(prev => prev + 1);
  };


  // Dynamic Grid Styling based on card count
  const getGridClass = () => {
    const count = cards.length;
    // Mobile first, then tablet/desktop
    if (count <= 12) return 'grid-cols-3 md:grid-cols-4 max-w-md'; 
    if (count <= 16) return 'grid-cols-4 max-w-lg'; 
    if (count <= 24) return 'grid-cols-4 md:grid-cols-6 max-w-2xl';
    if (count <= 32) return 'grid-cols-4 md:grid-cols-7 max-w-3xl'; // 28 cards
    return 'grid-cols-5 md:grid-cols-8 max-w-5xl'; // 36-40 cards
  };

  if (!worldId) return null;

  return (
    <div className="min-h-screen bg-[#CDEBFF] flex flex-col relative overflow-hidden">
      {showConfetti && (
        <ReactConfetti
          numberOfPieces={200}
          recycle={false}
          colors={isHoliday ? ['#E05858', '#4CC38A', '#FFE29A', '#FFFFFF'] : undefined}
        />
      )}
      
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-4xl mx-auto w-full z-10">
         <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm">
            <Star className="text-[#FFE9A8]" fill="#FFE9A8" />
            <span className="font-heading font-bold text-[#6B4F3F]">{Math.floor(matchedIds.length / 2)} / {cards.length / 2}</span>
         </div>
         
         <div className="flex gap-2">
           <Button variant="icon" onClick={() => setIsPaused(true)}>
              <Pause size={24} />
           </Button>
         </div>
      </header>

      {/* Game Board */}
      <main className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
         <div className={`grid ${getGridClass()} gap-3 w-full mx-auto pb-4 transition-all duration-300`}>
            {cards.map(card => (
                <Card 
                  key={card.id} 
                  item={card} 
                  squishmallow={getSquishmallow(card.characterId)} 
                  onClick={handleCardClick}
                  disabled={gameState !== GameState.PLAYING || isPaused}
                />
            ))}
         </div>
      </main>

      {/* Pause Modal */}
      {isPaused && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="text-center font-heading text-3xl text-[#6B4F3F] mb-2">Paused</h2>
                <Button variant="primary" fullWidth onClick={() => setIsPaused(false)}>
                    <Play size={20} /> Resume
                </Button>
                <Button variant="secondary" fullWidth onClick={initializeGame}>
                    <RotateCw size={20} /> Restart
                </Button>
                <Button variant="icon" className="self-center mt-2 border-0 shadow-none hover:bg-transparent text-gray-400 font-body" onClick={() => navigate('/')}>
                    Quit to Home
                </Button>
            </div>
        </div>
      )}

      {/* Win Modal */}
      {gameState === GameState.COMPLETED && (
        <div className="absolute inset-0 z-50 bg-[#CFF3E2]/90 flex items-center justify-center p-6">
             <div className="bg-white rounded-[2rem] p-8 w-full max-w-md flex flex-col items-center gap-6 shadow-2xl animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
                
                {newlyUnlocked.length > 0 ? (
                    <div className="w-full flex flex-col items-center gap-4">
                        <div className="w-full flex flex-col items-center gap-3 mb-2">
                            <div className="w-20 h-20 bg-[#FFE9A8] rounded-full flex items-center justify-center shadow-inner animate-pulse">
                                <Sparkles size={40} fill="#B48E25" stroke="none" />
                            </div>
                            <h2 className="font-heading text-3xl text-[#6B4F3F] text-center">New Friends Found!</h2>
                            <p className="font-body text-sm text-gray-500 text-center px-4">
                                Tap any friend to see their details and hear them say hello.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                            {newlyUnlocked.map((s, idx) => (
                                <button
                                    key={`${s.id}-${idx}`}
                                    onClick={() => setSelectedSquish(s)}
                                    className="group rounded-[32px] border border-white bg-white shadow-xl overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD6E8] transition-transform hover:-translate-y-1 active:translate-y-0"
                                    aria-label={`View details for ${s.name}`}
                                    style={{ animationDuration: '0.5s', animationDelay: `${idx * 0.05}s` }}
                                >
                                    <div className="relative w-full aspect-square bg-[#FDF7FF]">
                                        <img src={s.image} alt={s.name} className="w-full h-full object-contain p-4" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-[#6B4F3F] tracking-wide">
                                            {getAgeText(s)}
                                        </div>
                                    </div>
                                    <div className="p-3 text-center">
                                        <p className="font-heading text-base text-[#6B4F3F]">{s.name}</p>
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mt-1">{s.species || 'Best friend'}</p>
                                        <p className="text-[11px] text-[#6B4F3F] mt-2">{getAgeText(s)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-24 h-24 bg-[#FFE9A8] rounded-full flex items-center justify-center shadow-inner">
                            <Star size={48} fill="#B48E25" stroke="none" className="animate-bounce" />
                        </div>
                        <div className="text-center">
                            <h2 className="font-heading text-4xl text-[#6B4F3F] mb-1">Parade!</h2>
                            <p className="font-body text-gray-500">You found all the friends!</p>
                        </div>
                    </>
                )}
                
                <div className="w-full space-y-3 mt-2">
                    <Button variant="primary" fullWidth onClick={() => navigate('/worlds')}>
                        Next Level
                    </Button>
                    <Button variant="secondary" fullWidth onClick={initializeGame}>
                        Play Again
                    </Button>
                </div>
             </div>
        </div>
      )}

      {shouldShowReview && currentReviewEvent && (
        <div className="absolute inset-0 z-[70] bg-white/95 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white border-[6px] border-[#FFE9A8] rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-4 text-center">
            <p className="text-xs uppercase tracking-[0.45em] text-gray-400">Word Review</p>
            <p className="text-sm text-gray-500">Step {currentReviewIndex + 1} of {reviewQueue.length}</p>
            {currentReviewEvent.image && (
              <div className="w-32 h-32 mx-auto">
                <img
                  src={currentReviewEvent.image}
                  alt={currentReviewEvent.word}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <h3 className="font-heading text-3xl text-[#6B4F3F]">{currentReviewEvent.word}</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {currentReviewEvent.letters.map((letter, index) => (
                <span
                  key={`${letter}-${index}`}
                  className="px-3 py-2 text-lg font-semibold rounded-2xl border border-[#D1D5DB] bg-[#FDF5EE] text-[#6B4F3F]"
                >
                  {letter}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-600">{currentReviewEvent.hint}</p>
            <p className="text-sm text-gray-400 italic">{currentReviewEvent.sentence}</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="icon"
                onClick={() => soundManager.speak(currentReviewEvent.sentence)}
                aria-label={`Hear sentence for ${currentReviewEvent.word}`}
              >
                <Volume2 size={20} />
              </Button>
              <span className="text-xs uppercase tracking-[0.4em] text-gray-400">Play Sentence</span>
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => setCurrentReviewIndex(prev => prev + 1)}
            >
              {currentReviewIndex === reviewQueue.length - 1 ? 'Finish Review' : 'Next Word'}
            </Button>
            <p className="text-xs text-gray-400 px-4">
              Listen along and say the word, then tap “{currentReviewIndex === reviewQueue.length - 1 ? 'Finish Review' : 'Next Word'}” to keep going.
            </p>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedSquish && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 border-8 border-[#CDEBFF] relative max-h-[90vh] overflow-y-auto no-scrollbar">
                
                <button 
                    onClick={closeSelectedSquish} 
                    className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="w-full aspect-square bg-gradient-to-br from-[#FFF0F5] to-white rounded-3xl p-6 flex items-center justify-center shadow-inner mt-2">
                     <img src={selectedSquish.image} alt={selectedSquish.name} className="w-full h-full object-contain drop-shadow-xl" />
                </div>
                
                <div className="text-center flex flex-col gap-2">
                     <div>
                        <h3 className="font-heading text-4xl text-[#6B4F3F] leading-tight">{selectedSquish.name}</h3>
                        {selectedSquish.species && (
                            <span className="bg-[#FFE9A8] text-[#8A6D1F] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block mt-1">
                                {selectedSquish.species}
                            </span>
                        )}
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

                 <Button variant="secondary" fullWidth onClick={() => setSelectedSquish(null)}>
                    Close
                </Button>
            </div>
        </div>
      )}
    </div>
  );
};
