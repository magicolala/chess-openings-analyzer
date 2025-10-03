import { DuelPlayerProfile } from './types';

function extractCountryCode(url: string | undefined): string | undefined {
  if (typeof url !== 'string' || !url) {
    return undefined;
  }
  const segments = url.split('/').filter(Boolean);
  return segments[segments.length - 1];
}

export function adaptPlayerProfile(raw: unknown): DuelPlayerProfile {
  if (!raw || typeof raw !== 'object') {
    return { username: '', name: undefined, avatar: undefined, country: undefined, joined: null, url: undefined };
  }
  const source = raw as Record<string, unknown>;
  return {
    username: String(source.username ?? source.player_id ?? ''),
    name: typeof source.name === 'string' ? source.name : undefined,
    avatar: typeof source.avatar === 'string' ? source.avatar : undefined,
    country: extractCountryCode(typeof source.country === 'string' ? source.country : undefined),
    joined: typeof source.joined === 'number' ? new Date(source.joined * 1000) : null,
    url: typeof source.url === 'string' ? source.url : undefined,
  };
}
