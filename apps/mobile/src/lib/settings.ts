import * as SecureStore from 'expo-secure-store';

const SERPAPI_KEY = 'serpapi_key';
const SERVER_URL = 'server_url';

/**
 * Where searches go. With a SerpApi key the phone calls SerpApi directly; with a server URL
 * it uses the NoTopi server, which holds the key and caches results for everyone.
 */
export interface Settings {
  serpApiKey: string | null;
  serverUrl: string | null;
}

const DEVICE_ID = 'device_id';

/**
 * A random id made once per install, sent to the NoTopi server only so it can rate-limit
 * per phone. It isn't tied to the user, the phone number or any account.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID);
  if (existing) return existing;
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  await SecureStore.setItemAsync(DEVICE_ID, id);
  return id;
}

export async function loadSettings(): Promise<Settings> {
  const [serpApiKey, serverUrl] = await Promise.all([
    SecureStore.getItemAsync(SERPAPI_KEY),
    SecureStore.getItemAsync(SERVER_URL),
  ]);
  return { serpApiKey: serpApiKey || null, serverUrl: serverUrl || null };
}

/** "192.168.1.10:8080/" → "http://192.168.1.10:8080". Typed addresses usually lack the scheme. */
export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

/** A reason the server address can't work, or null if it looks fine. */
export function serverUrlProblem(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.port === '8081') return 'Port 8081 is the app’s development server. The NoTopi server usually runs on 8080.';
    return null;
  } catch {
    return 'That doesn’t look like a web address. Try http://localhost:8080';
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  const serverUrl = s.serverUrl ? normalizeServerUrl(s.serverUrl) : '';
  await Promise.all([
    s.serpApiKey ? SecureStore.setItemAsync(SERPAPI_KEY, s.serpApiKey.trim()) : SecureStore.deleteItemAsync(SERPAPI_KEY),
    serverUrl ? SecureStore.setItemAsync(SERVER_URL, serverUrl) : SecureStore.deleteItemAsync(SERVER_URL),
  ]);
}
