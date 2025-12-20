const MULTIPLAYER_WS_ENV = import.meta.env.VITE_MULTIPLAYER_WS_URL?.trim();
const PROFILE_API_ENV = import.meta.env.VITE_PROFILE_API_BASE?.trim();

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getProfileApiBase = () => {
  if (PROFILE_API_ENV) {
    return trimTrailingSlash(PROFILE_API_ENV);
  }
  if (!MULTIPLAYER_WS_ENV) {
    return null;
  }
  try {
    const parsed = new URL(MULTIPLAYER_WS_ENV);
    if (parsed.protocol === 'wss:') {
      parsed.protocol = 'https:';
    } else if (parsed.protocol === 'ws:') {
      parsed.protocol = 'http:';
    }
    parsed.pathname = '';
    parsed.search = '';
    parsed.hash = '';
    return trimTrailingSlash(parsed.origin);
  } catch {
    return null;
  }
};

export interface PlayerProfileResponse {
  name: string;
  profilePictureKey?: string | null;
}

export interface UploadProfileResponse {
  profilePictureKey: string;
}

export const fetchPlayerProfile = async (baseUrl: string, name: string) => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Name is required');
  }
  const response = await fetch(`${trimTrailingSlash(baseUrl)}/profile?name=${encodeURIComponent(trimmed)}`);
  if (!response.ok) {
    throw new Error(`Profile lookup failed (${response.status})`);
  }
  return (await response.json()) as PlayerProfileResponse;
};

export const uploadProfilePicture = async (baseUrl: string, name: string, file: File) => {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Name is required');
  }
  const formData = new FormData();
  formData.append('name', trimmed);
  formData.append('image', file);
  const response = await fetch(`${trimTrailingSlash(baseUrl)}/profile-picture`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Upload failed (${response.status})`);
  }
  return (await response.json()) as UploadProfileResponse;
};

export const buildProfilePictureUrl = (baseUrl: string, key: string) => {
  return `${trimTrailingSlash(baseUrl)}/profile-picture/${encodeURIComponent(key)}`;
};
