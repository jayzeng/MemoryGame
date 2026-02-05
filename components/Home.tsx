import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { Play, Book, Trophy, Edit2, Snowflake, Camera, Settings } from 'lucide-react';
import { PLAYER_NAME_EVENT, storage } from '../utils/storage';
import { MOCK_SQUISHMALLOWS } from '../constants';
import type { Squishmallow } from '../types';
import './Home.css';
import { useHoliday } from './HolidayContext';
import {
  buildProfilePictureUrl,
  fetchPlayerProfile,
  fetchTakenNames,
  getProfileApiBase,
  uploadProfilePicture,
} from '../utils/profile';
import { useMultiplayer } from './MultiplayerProvider';
import { useParentMode } from './ParentModeContext';
import { ParentSettingsModal } from './ParentSettingsModal';

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

const FRIENDLY_SUFFIXES = [
  'Sprout',
  'Mochi',
  'Spark',
  'Bubble',
  'Giggles',
  'Sunny',
  'Pebble',
  'Waffle',
  'Puff',
  'Noodle',
  'Snuggle',
  'Berry',
  'Doodle',
  'Bumble',
  'Cloud',
  'Cocoa',
  'Twinkle',
  'Glimmer',
  'Pip',
  'Jelly',
  'Wiggle',
  'Hug',
  'Mellow',
];

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

const getNameStem = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const firstWord = (trimmed.split(/\s+/).find(Boolean) ?? trimmed).trim();
  const lettersOnly = firstWord.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly) return lettersOnly;
  const alphanumeric = firstWord.replace(/[^a-zA-Z0-9]/g, '');
  return alphanumeric || trimmed.replace(/\s+/g, '');
};

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
  const [savedName, setSavedName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [collectedCount, setCollectedCount] = useState(0);
  const [floatingSquishmallows] = useState<Squishmallow[]>(() => getRandomSquishmallows(ORBIT_CONFIGS.length));
  const pauseTimers = useRef<Record<string, number>>({});
  const [pausedOrbitIds, setPausedOrbitIds] = useState<Record<string, boolean>>({});
  const { isHoliday } = useHoliday();
  const profileApiBase = useMemo(() => getProfileApiBase(), []);
  const [profilePictureKey, setProfilePictureKey] = useState<string | null>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [remoteNames, setRemoteNames] = useState<Set<string>>(() => new Set());
  const [isCheckingName, setIsCheckingName] = useState(false);
  const { players } = useMultiplayer();
  const { requestParentUnlock } = useParentMode();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadRemoteNames = useCallback(async () => {
    if (!profileApiBase) return new Set<string>();
    try {
      const names = await fetchTakenNames(profileApiBase);
      const normalized = names
        .map((value) => normalizeName(value))
        .filter(Boolean) as string[];
      const next = new Set<string>(normalized);
      setRemoteNames(next);
      return next;
    } catch (error) {
      console.warn('Unable to load names from the backend', error);
      return new Set<string>();
    }
  }, [profileApiBase]);

  useEffect(() => {
    loadRemoteNames();
  }, [loadRemoteNames]);

  const buildTakenNames = useCallback(
    (external?: Set<string>) => {
      const names = new Set<string>();
      (external ?? remoteNames).forEach((value) => {
        const normalizedEntry = normalizeName(value);
        if (normalizedEntry) {
          names.add(normalizedEntry);
        }
      });
      storage.getLeaderboard().forEach((entry) => {
        const normalizedEntry = normalizeName(entry.name);
        if (normalizedEntry) {
          names.add(normalizedEntry);
        }
      });
      players.forEach((player) => {
        const normalizedEntry = normalizeName(player.name);
        if (normalizedEntry) {
          names.add(normalizedEntry);
        }
      });

      const normalizedSaved = normalizeName(savedName);
      if (normalizedSaved) {
        names.delete(normalizedSaved);
      }

      return names;
    },
    [players, remoteNames, savedName]
  );

  const isNameTaken = useCallback(
    (candidate: string, takenSet?: Set<string>) => {
      const normalized = normalizeName(candidate);
      const stemNormalized = normalizeName(getNameStem(candidate));
      if (!normalized && !stemNormalized) return false;
      const set = takenSet ?? buildTakenNames();
      if (normalized && set.has(normalized)) return true;
      if (stemNormalized && set.has(stemNormalized)) return true;
      return false;
    },
    [buildTakenNames]
  );

  const suggestName = useCallback(
    (candidate: string, takenSet?: Set<string>) => {
      const set = takenSet ?? buildTakenNames();
      const stem = getNameStem(candidate) || 'Parade';
      const shuffled = [...FRIENDLY_SUFFIXES];
      const maxLength = 12;

      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      for (const suffix of shuffled) {
        const maxBaseLength = Math.max(3, maxLength - suffix.length - 1);
        if (maxBaseLength <= 0) continue;
        const clipped = stem.slice(0, maxBaseLength);
        const suggestion = `${clipped} ${suffix}`.slice(0, maxLength);
        if (!isNameTaken(suggestion, set)) {
          return suggestion;
        }
      }
      return null;
    },
    [buildTakenNames, isNameTaken]
  );

  // Load initial state
  useEffect(() => {
    const storedName = storage.getPlayerName();
    if (storedName) {
      setName(storedName);
      setSavedName(storedName);
    } else {
      setIsEditing(true);
    }
    refreshCount();
  }, []);

  useEffect(() => {
    const handleNameChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setSavedName(detail);
        setName(detail);
      }
    };
    window.addEventListener(PLAYER_NAME_EVENT, handleNameChange as EventListener);
    return () => window.removeEventListener(PLAYER_NAME_EVENT, handleNameChange as EventListener);
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    setCameraSupported(
      typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices !== 'undefined' &&
        typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const mobileRegex =
        /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const userAgent = navigator.userAgent;
      const isAppleMobile = /iPad|iPhone|iPod/i.test(userAgent);
      const isIpadOs = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
      setIsMobileDevice(mobileRegex.test(userAgent) || isIpadOs);
      setIsIosDevice(isAppleMobile || isIpadOs);
    }

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!profileApiBase) {
      setProfilePictureKey(null);
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      setProfilePictureKey(null);
      return;
    }
    let isCancelled = false;
    fetchPlayerProfile(profileApiBase, trimmed)
      .then((result) => {
        if (isCancelled) return;
        setProfilePictureKey(result.profilePictureKey ?? null);
      })
      .catch(() => {
        if (!isCancelled) {
          setProfilePictureKey(null);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [name, profileApiBase]);

  useEffect(() => {
    if (!profilePictureKey || !profileApiBase) {
      setProfilePictureUrl(null);
      return;
    }
    setProfilePictureUrl(buildProfilePictureUrl(profileApiBase, profilePictureKey));
  }, [profilePictureKey, profileApiBase]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const refreshCount = () => {
    setCollectedCount(storage.getUnlockedIds().length);
  };

  const handleSaveName = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    let takenNames = buildTakenNames();
    if (profileApiBase && remoteNames.size === 0) {
      setIsCheckingName(true);
      try {
        const remoteSet = await loadRemoteNames();
        takenNames = buildTakenNames(remoteSet);
      } finally {
        setIsCheckingName(false);
      }
    }

    if (isNameTaken(trimmed, takenNames)) {
      const alternative = suggestName(trimmed, takenNames);
      setSuggestedName(alternative);
      setNameFeedback(
        alternative
          ? `${trimmed} is already taken, what about ${alternative}?`
          : `${trimmed} is already taken, please try another name.`
      );
      return;
    }

    setNameFeedback(null);
    setSuggestedName(null);
    storage.setPlayerName(trimmed);
    setSavedName(trimmed);
    setIsEditing(false);

    storage.updateLeaderboard();
    refreshCount();
  };

  const ensurePhotoPrerequisites = () => {
    if (!savedName.trim()) {
      setPhotoFeedback('Add your name first so we can save your photo.');
      return false;
    }
    if (!profileApiBase) {
      setPhotoFeedback('Turn on multiplayer to save your photo.');
      return false;
    }
    return true;
  };

  const uploadPendingPhotoFile = async (file: File) => {
    if (!profileApiBase) return;
    if (!savedName.trim()) return;
    setIsUploadingPhoto(true);
    let success = false;
    try {
      const result = await uploadProfilePicture(profileApiBase, savedName.trim(), file);
      if (result.profilePictureKey) {
        setProfilePictureKey(result.profilePictureKey);
        setPhotoFeedback('Profile photo saved!');
        success = true;
      }
    } catch (error) {
      console.error(error);
      setPhotoFeedback('Unable to save the photo—please try again.');
    } finally {
      setIsUploadingPhoto(false);
      if (!success) {
        // Keep the preview visible so it feels like the photo "stuck" even if saving failed.
      } else {
        setPendingPhotoFile(null);
        setPreviewUrl(null);
      }
    }
  };

  const handlePhotoFile = async (file: File) => {
    setPhotoFeedback(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
    setPendingPhotoFile(file);

    if (!ensurePhotoPrerequisites()) {
      return;
    }

    await uploadPendingPhotoFile(file);
  };

  useEffect(() => {
    if (!pendingPhotoFile) return;
    if (!profileApiBase) return;
    if (!savedName.trim()) return;
    if (isUploadingPhoto) return;
    uploadPendingPhotoFile(pendingPhotoFile);
  }, [isUploadingPhoto, pendingPhotoFile, profileApiBase, savedName]);

  const handlePhotoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await handlePhotoFile(file);
  };

  const openPhotoPicker = () => {
    try {
      if (fileInputRef.current && typeof (fileInputRef.current as any).showPicker === 'function') {
        (fileInputRef.current as any).showPicker();
        return;
      }
      fileInputRef.current?.click();
    } catch (error) {
      console.error('Unable to open photo picker', error);
      setPhotoFeedback('This device blocked the photo picker. Please try camera mode instead.');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
  };

  const openCamera = async () => {
    if (!cameraSupported) {
      setPhotoFeedback('Camera capture is not supported in this browser.');
      return;
    }
    setPhotoFeedback(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Camera access failed', error);
      setPhotoFeedback('Unable to access the camera.');
      closeCamera();
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setPhotoFeedback('Unable to capture the photo.');
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      setPhotoFeedback('Unable to capture the photo.');
      return;
    }
    const file = new File([blob], 'camera-photo.png', { type: blob.type || 'image/png' });
    try {
      await handlePhotoFile(file);
    } finally {
      closeCamera();
    }
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
  const avatarUrl = previewUrl || profilePictureUrl;
  const showCameraButton = cameraSupported && !isMobileDevice;
  const showUploadButton = isMobileDevice || !cameraSupported;
  const captureAttr = isIosDevice ? undefined : 'environment';
  const orbitScale = viewportWidth < 480 ? 0.55 : viewportWidth < 768 ? 0.72 : viewportWidth < 1024 ? 0.9 : 1;
  const scaledOrbits = useMemo(
    () =>
      ORBIT_CONFIGS.map((config) => ({
        ...config,
        radius: Math.round(config.radius * orbitScale),
        size: Math.max(48, Math.round(config.size * orbitScale + 8)),
      })),
    [orbitScale]
  );

  return (
    <div className="relative h-screen min-h-[600px] bg-[#CDEBFF] flex flex-col items-center justify-center px-4 sm:px-6 py-4 text-center gap-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-hidden">
      {/* Settings Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={async () => {
            const unlocked = await requestParentUnlock();
            if (unlocked) setIsSettingsOpen(true);
          }}
          className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-[#6B4F3F] hover:bg-white transition-all border border-white"
          title="Parent Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      <ParentSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {scaledOrbits.map((config, index) => {
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
                  transform: 'translate3d(0, 0, 0)',
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
                      className="relative rounded-2xl border border-white/80 bg-white/90 shadow-xl overflow-hidden"
                      style={{ width: `${config.size}px`, height: `${config.size}px` }}
                    >
                      <img
                        src={squish.image}
                        alt={squish.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="font-heading text-[0.6rem] text-[#FF8FAB] drop-shadow-sm">
                      {squish.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-4 w-full max-w-5xl mx-auto h-full max-h-[800px]">
        <div className="relative flex flex-col items-center gap-3 animate-in slide-in-from-top duration-700">
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-[#FFD6E8]/90 via-[#FF8FAB]/60 to-transparent opacity-75 blur-2xl" />
              <div className="relative bg-white p-4 md:p-5 rounded-[2.5rem] shadow-xl border-4 border-[#FFD6E8] animate-dance origin-center">
                <h1 className="font-heading text-4xl md:text-5xl text-[#6B4F3F] leading-tight">
                  Squishmallow
                  <br />
                  <span className="text-[#FF8FAB]">Memory</span>
                  <br />
                  Parade
                </h1>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center w-full">
          {/* Side Buttons - Floating Stickers (Desktop Only) */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-6 -translate-x-12">
            <Link to="/book" className="transform -rotate-6 hover:rotate-0 transition-transform">
              <div className="bg-[#DCCBFF] p-4 rounded-[2.5rem] shadow-2xl border-4 border-white flex flex-col items-center gap-2 w-36 hover:scale-110 transition-all">
                <div className="bg-white p-3 rounded-2xl text-[#6B4F3F] shadow-inner">
                  <Book size={28} />
                </div>
                <span className="font-heading text-base text-[#6B4F3F] font-bold uppercase tracking-widest">My Pals</span>
              </div>
            </Link>
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-6 translate-x-12">
            <Link to="/leaderboard" className="transform rotate-6 hover:rotate-0 transition-transform">
              <div className="bg-[#CFF3E2] p-4 rounded-[2.5rem] shadow-2xl border-4 border-white flex flex-col items-center gap-2 w-36 hover:scale-110 transition-all">
                <div className="bg-white p-3 rounded-2xl text-[#6B4F3F] shadow-inner">
                  <Trophy size={28} />
                </div>
                <span className="font-heading text-base text-[#6B4F3F] font-bold uppercase tracking-widest leading-none text-center">Top<br/>Parade</span>
              </div>
            </Link>
          </div>

          {/* Player Profile Polaroid Card */}
          <div className="relative group perspective-1000 animate-in zoom-in duration-500" style={{ animationDelay: '0.4s' }}>
            <div className="bg-white p-3 pb-12 rounded-sm shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-gray-100 transform -rotate-1 group-hover:rotate-0 transition-all duration-500 hover:scale-105">
              <div className="relative w-44 h-44 md:w-52 md:h-52 bg-gray-50 overflow-hidden rounded-sm border-2 border-gray-50 flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name ? `${name}'s profile photo` : 'Profile photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center px-3 text-center opacity-30">
                    <Camera size={44} className="text-[#B48E25] mb-2" />
                    <span className="text-[0.65rem] tracking-[0.3em] uppercase text-[#B48E25] font-heading">Add Photo</span>
                  </div>
                )}
                
                {/* Photo Actions Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  {showUploadButton && (
                    <button 
                      onClick={openPhotoPicker} 
                      disabled={isUploadingPhoto}
                      className="p-3 bg-white rounded-full text-[#6B4F3F] hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
                    >
                      <Camera size={20} />
                    </button>
                  )}
                  {showCameraButton && (
                    <button 
                      onClick={openCamera} 
                      disabled={isUploadingPhoto}
                      className="p-3 bg-white rounded-full text-[#6B4F3F] hover:scale-110 transition-transform shadow-lg disabled:opacity-50"
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                </div>
                
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="w-6 h-6 border-4 border-[#FF8FAB] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
	              <div className="absolute bottom-3 left-0 right-0 px-3">
	                {photoFeedback && (
	                  <p className="mb-1 text-[0.55rem] text-[#6B4F3F]/70 font-heading text-center">
	                    {photoFeedback}
	                  </p>
	                )}
	                {isEditing ? (
	                  <div className="flex flex-col gap-1">
	                    <form onSubmit={handleSaveName} className="flex gap-2">
	                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setNameFeedback(null);
                          setSuggestedName(null);
                        }}
                        placeholder="Your Name"
                        className="flex-1 bg-transparent border-b-2 border-[#DCCBFF] px-1 py-0.5 font-heading text-[#6B4F3F] text-center focus:outline-none focus:border-[#FF8FAB] text-lg"
                        maxLength={12}
                        autoFocus
                      />
                      <button type="submit" className="p-1 text-[#FF8FAB] hover:scale-110 transition-transform">
                        <Edit2 size={18} />
                      </button>
                    </form>
                    {nameFeedback && (
                      <p className="text-[0.55rem] text-red-400 font-bold uppercase tracking-tighter">{nameFeedback}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center gap-2 cursor-pointer group/name" onClick={() => setIsEditing(true)}>
                      <h2 className="font-heading text-2xl text-[#6B4F3F]">{name || 'New Friend'}</h2>
                      <Edit2 size={14} className="text-[#6B4F3F] opacity-0 group-hover/name:opacity-30 transition-opacity" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Polaroid Tape Decor */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-[#FFD6E8]/60 backdrop-blur-sm -rotate-2 z-10 border border-white/40 shadow-sm" />
          </div>
        </div>

        {/* Progress and Play Section */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          {/* Collection Squishy Progress Bar */}
          <div className="w-full bg-white/40 backdrop-blur-sm rounded-[2rem] p-4 shadow-inner border border-white/80 animate-in slide-in-from-bottom duration-700 delay-200">
            <div className="flex items-center justify-between mb-1.5 px-2">
              <p className="font-heading text-[#6B4F3F] text-[0.6rem] uppercase tracking-[0.2em] font-bold">Parade Progress</p>
              <span className="font-heading text-[#FF8FAB] text-xs font-bold">{collectedCount} / {MOCK_SQUISHMALLOWS.length}</span>
            </div>
            <div className="relative w-full h-7 bg-white/80 rounded-full border-2 border-[#FFE9A8] overflow-hidden shadow-sm">
              <div
                className="h-full bg-gradient-to-r from-[#FFD6E8] to-[#FF8FAB] transition-all duration-1000 relative rounded-full"
                style={{ width: `${Math.max(8, (collectedCount / MOCK_SQUISHMALLOWS.length) * 100)}%` }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent h-1/2" />
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-3 animate-in slide-in-from-bottom duration-700 delay-300">
            <Link to="/worlds" className={`w-full ${!playLink ? 'pointer-events-none' : ''}`} aria-disabled={!playLink}>
              <Button
                variant="primary"
                fullWidth
                className="h-16 text-2xl shadow-xl hover:scale-105 transition-transform"
                disabled={!playLink}
              >
                <Play fill="#6B4F3F" className="mr-2" size={28} />
                Start Parade
              </Button>
            </Link>

            {/* Mobile/Small Screen Action Buttons */}
            <div className="flex lg:hidden gap-3">
              <Link to="/book" className="flex-1">
                <Button variant="secondary" fullWidth className="h-12 text-sm bg-white border-[#E6E6E6] shadow-md">
                  <Book className="mr-2 text-[#6B4F3F]" size={16} />
                  My Pals
                </Button>
              </Link>
              <Link to="/leaderboard" className="flex-1">
                <Button
                  variant="secondary"
                  fullWidth
                  className="h-12 text-sm bg-[#CFF3E2] border-[#a5e0c5] hover:bg-[#bbf0da] shadow-md"
                >
                  <Trophy className="mr-2" size={16} />
                  Leaderboard
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Premium Badge Footer */}
        <footer className="mt-auto pb-4 animate-in fade-in duration-1000 delay-400">
          <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/90 backdrop-blur-md shadow-md border-2 border-[#DCCBFF] text-[#6B4F3F]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#CFF3E2] animate-pulse" />
            <span className="text-[0.6rem] font-heading font-bold uppercase tracking-[0.2em] whitespace-nowrap">
              Safe & Cozy Play • No Ads
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD6E8] animate-pulse" />
          </div>
        </footer>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={captureAttr}
        className="hidden"
        onChange={handlePhotoSelection}
      />

      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-black/70 backdrop-blur-sm p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-4 shadow-2xl space-y-4 border-8 border-[#DCCBFF] animate-in zoom-in-95 duration-300">
            <div className="relative aspect-video rounded-[1.5rem] overflow-hidden bg-black shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                fullWidth
                onClick={capturePhoto}
                disabled={isUploadingPhoto}
                className="flex-1 h-14"
              >
                {isUploadingPhoto ? 'Saving…' : 'Take Photo'}
              </Button>
              <Button
                variant="secondary"
                onClick={closeCamera}
                className="flex-1 h-14 border-[#E6E6E6]"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
