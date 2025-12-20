import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button';
import { Play, Book, Trophy, Edit2, Snowflake, Camera } from 'lucide-react';
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
    if (!name.trim()) {
      setPhotoFeedback('Save your name before capturing a photo.');
      return false;
    }
    if (!profileApiBase) {
      setPhotoFeedback('Enable the multiplayer backend before uploading photos.');
      return false;
    }
    return true;
  };

  const handlePhotoFile = async (file: File) => {
    if (!profileApiBase) return;
    let preview: string | null = null;
    setPhotoFeedback(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setIsUploadingPhoto(true);
    let success = false;
    try {
      const result = await uploadProfilePicture(profileApiBase, name.trim(), file);
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
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      if (!success) {
        setPreviewUrl(null);
      }
    }
  };

  const handlePhotoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ensurePhotoPrerequisites()) {
      return;
    }
    await handlePhotoFile(file);
  };

  const openPhotoPicker = () => {
    if (!ensurePhotoPrerequisites()) return;
    try {
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
    if (!ensurePhotoPrerequisites()) {
      return;
    }
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
    <div className="relative min-h-screen bg-[#CDEBFF] flex flex-col items-center justify-center px-4 sm:px-6 pt-8 pb-16 text-center gap-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-hidden">
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

      <div className="relative z-10 flex flex-col items-center justify-center gap-8 w-full max-w-5xl mx-auto">
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
            <p className="max-w-xl px-6 font-body text-sm text-[#6B4F3F]/80 md:text-base leading-relaxed">
              {HERO_TAGLINE}
            </p>
          </div>
        </div>

        <div className="w-full max-w-lg bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-lg border-4 border-white animate-in zoom-in duration-500 animate-float" style={{ animationDelay: '1s' }}>
        <div className="flex flex-col items-center gap-4 mb-4">
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="relative">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-white/80 shadow-2xl overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name ? `${name}'s profile photo` : 'Profile photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center px-3 text-center">
                    <span className="text-[0.55rem] tracking-[0.4em] uppercase text-[#B48E25]">Add</span>
                    <span className="text-[0.65rem] tracking-[0.3em] uppercase text-[#B48E25]">photo</span>
                  </div>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="flex flex-col gap-2 w-full">
                <form className="flex gap-2 w-full" onSubmit={handleSaveName}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameFeedback(null);
                      setSuggestedName(null);
                    }}
                    placeholder="Enter your name"
                    className="flex-1 bg-white border-2 border-[#DCCBFF] rounded-xl px-4 py-2 font-heading text-[#6B4F3F] text-lg focus:outline-none focus:border-[#6B4F3F]"
                    maxLength={12}
                  />
                  <Button
                    variant="secondary"
                    type="submit"
                    className="rounded-xl px-4 py-2 font-heading uppercase tracking-wide text-xs"
                    disabled={!name.trim() || isCheckingName}
                  >
                    {isCheckingName ? 'Checking...' : 'Save'}
                  </Button>
                </form>
                {nameFeedback && (
                  <div className="w-full rounded-xl border border-[#F2B8B5] bg-[#FFF1F0] px-4 py-3 text-left text-sm text-[#B33A3A]">
                    <p className="font-heading mb-1">{nameFeedback}</p>
                    {suggestedName && (
                      <button
                        type="button"
                        onClick={() => {
                          setName(suggestedName);
                          setNameFeedback(null);
                        }}
                        className="rounded-full bg-white px-3 py-1 text-[0.75rem] font-heading font-bold uppercase tracking-wide text-[#B33A3A] shadow-sm border border-[#F2B8B5] hover:bg-[#FFECEC]"
                      >
                        Use {suggestedName}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex items-center gap-2 group cursor-pointer"
                onClick={() => setIsEditing(true)}
              >
                <h2 className="font-heading text-2xl text-[#6B4F3F]">Hi, {name}!</h2>
                <Edit2 size={16} className="opacity-0 group-hover:opacity-50" />
              </div>
            )}
            {(showUploadButton || showCameraButton) && (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  {showUploadButton && (
                    <button
                      type="button"
                      onClick={openPhotoPicker}
                      disabled={isUploadingPhoto || !name.trim() || !profileApiBase}
                      className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-[0.7rem] font-heading font-bold uppercase tracking-[0.4em] text-[#6B4F3F] shadow-lg transition duration-200 hover:border-[#FF8FAB] disabled:opacity-40 disabled:hover:border-white"
                    >
                      <Camera size={16} />
                      {isUploadingPhoto ? 'Saving...' : 'Upload photo'}
                    </button>
                  )}
                  {showCameraButton && (
                    <button
                      type="button"
                      onClick={openCamera}
                      disabled={isUploadingPhoto}
                      className="inline-flex items-center gap-2 rounded-full border border-[#DCCBFF] bg-[#DCCBFF]/60 px-4 py-2 text-[0.7rem] font-heading font-bold uppercase tracking-[0.4em] text-[#6B4F3F] shadow-lg transition duration-200 hover:border-[#B0A2FF] disabled:opacity-40 disabled:hover:border-[#DCCBFF]"
                    >
                      Camera
                    </button>
                  )}
                </div>
                {photoFeedback && (
                  <p className="text-[0.65rem] text-[#6B4F3F]/70">{photoFeedback}</p>
                )}
                {!profileApiBase && (
                  <p className="text-[0.65rem] text-[#6B4F3F]/60">
                    Multiplayer backend required for photo uploads.
                  </p>
                )}
                {!isMobileDevice && !cameraSupported && (
                  <p className="text-[0.65rem] text-[#6B4F3F]/60">
                    Live camera capture is available only on supported browsers.
                  </p>
                )}
              </div>
            )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture={captureAttr}
                className="hidden"
                onChange={handlePhotoSelection}
              />
          </div>
        </div>
        {isCameraOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-[2rem] bg-white/95 p-4 shadow-2xl space-y-4">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-[1.5rem] bg-black"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={isUploadingPhoto}
                  className="flex-1 rounded-full bg-[#FFD6E8] px-4 py-3 text-[0.8rem] font-heading font-bold uppercase tracking-[0.3em] text-[#6B4F3F] shadow-lg transition duration-200 hover:bg-[#ffc2dd] disabled:opacity-40"
                >
                  {isUploadingPhoto ? 'Saving…' : 'Take photo'}
                </button>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="flex-1 rounded-full border border-[#DCCBFF] bg-white px-4 py-3 text-[0.8rem] font-heading font-bold uppercase tracking-[0.3em] text-[#6B4F3F] shadow-lg transition duration-200 hover:border-[#6B4F3F]"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[0.65rem] text-[#6B4F3F]/60">
                Use your device camera to take a cozy profile shot.
              </p>
            </div>
          </div>
        )}

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

        <footer className="fixed bottom-3 left-1/2 -translate-x-1/2 text-[#6B4F3F] opacity-60 text-xs sm:text-sm font-bold px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm shadow-md border border-white">
          Safe & Cozy Play • No Ads
        </footer>
      </div>
    </div>
  );
};
