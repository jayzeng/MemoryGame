import type { Env } from './types';
import { LeaderboardRoom } from './leaderboardRoom';
import { sanitizeName } from './playerUtils';
export { LeaderboardRoom };

const DEFAULT_ROOM = 'memorygame';
const PROFILE_PATH = '/profile';
const PROFILE_PICTURE_PATH = '/profile-picture';
const PROFILE_PICTURE_DOWNLOAD_PREFIX = `${PROFILE_PICTURE_PATH}/`;
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const getRoomName = (request: Request) => {
  const url = new URL(request.url);
  return url.searchParams.get('room')?.trim().toLowerCase() || DEFAULT_ROOM;
};

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });

const getFileExtension = (mimeType?: string) => {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'png';
  }
};

const persistProfileKey = async (env: Env, room: string, name: string, key: string) => {
  const durableId = env.LEADERBOARD_DO.idFromName(room);
  const stub = env.LEADERBOARD_DO.get(durableId);
  try {
    const response = await stub.fetch(
      new Request('https://leaderboard/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, profilePictureKey: key }),
      })
    );
    if (!response.ok) {
      const text = await response.text();
      console.warn('Failed to persist profile metadata', response.status, text);
    }
  } catch (error) {
    console.warn('Failed to persist profile metadata', error);
  }
};

const handleProfilePictureUpload = async (request: Request, env: Env) => {
  if (!env.PROFILE_PICS) {
    return buildJsonResponse({ error: 'Profile storage is not configured' }, 500);
  }
  const formData = await request.formData();
  const rawName = (formData.get('name') as string | null)?.trim();
  const imageField = formData.get('image');
  if (!rawName || !(imageField instanceof File)) {
    return buildJsonResponse({ error: 'Both name and image file are required' }, 400);
  }
  const { id, display } = sanitizeName(rawName);
  const extension = getFileExtension(imageField.type);
  const timestamp = Date.now();
  const key = `profiles/${id}/${timestamp}.${extension}`;
  await env.PROFILE_PICS.put(key, imageField.stream(), {
    httpMetadata: { contentType: imageField.type || 'image/png' },
  });
  await persistProfileKey(env, getRoomName(request), display, key);
  return buildJsonResponse({ profilePictureKey: key });
};

const handleProfilePictureRequest = async (request: Request, env: Env) => {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method === 'POST' && url.pathname === PROFILE_PICTURE_PATH) {
    return handleProfilePictureUpload(request, env);
  }
  if (request.method === 'GET' && url.pathname.startsWith(PROFILE_PICTURE_DOWNLOAD_PREFIX)) {
    const key = decodeURIComponent(url.pathname.slice(PROFILE_PICTURE_DOWNLOAD_PREFIX.length));
    if (!key) {
      return buildJsonResponse({ error: 'Missing profile key' }, 400);
    }
    if (!env.PROFILE_PICS) {
      return buildJsonResponse({ error: 'Profile storage is not configured' }, 500);
    }
    const stored = await env.PROFILE_PICS.get(key);
    if (!stored || !stored.body) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }
    const headers = new Headers({
      ...CORS_HEADERS,
      'Content-Type': stored.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    return new Response(stored.body, { status: 200, headers });
  }
  if (request.method === 'GET' && url.pathname === PROFILE_PICTURE_PATH) {
    return buildJsonResponse({ error: 'Profile key is required' }, 400);
  }
  return buildJsonResponse({ error: 'Not found' }, 404);
};

const forwardProfileRequest = (request: Request, env: Env) => {
  const room = getRoomName(request);
  const durableId = env.LEADERBOARD_DO.idFromName(room);
  const stub = env.LEADERBOARD_DO.get(durableId);
  return stub.fetch(request);
};

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('Memory Game multiplayer worker is healthy', {
        status: 200,
      });
    }
    if (url.pathname === PROFILE_PATH) {
      return forwardProfileRequest(request, env);
    }
    if (url.pathname === '/ws') {
      const room = getRoomName(request);
      const durableId = env.LEADERBOARD_DO.idFromName(room);
      const stub = env.LEADERBOARD_DO.get(durableId);
      return stub.fetch(request);
    }
    if (url.pathname.startsWith(PROFILE_PICTURE_PATH)) {
      return handleProfilePictureRequest(request, env);
    }
    return new Response('Not found', { status: 404 });
  },
};
