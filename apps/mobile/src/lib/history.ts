import Storage from 'expo-sqlite/kv-store';
import type { VerdictLevel } from '@notopi/engine';

export interface HistoryEntry {
  raw: string;
  level: VerdictLevel;
  checkedAt: number;
}

const KEY = 'history';
const MAX = 30;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return JSON.parse((await Storage.getItem(KEY)) ?? '[]') as HistoryEntry[];
  } catch {
    return [];
  }
}

/** Newest first; checking the same thing again moves it to the top instead of duplicating it. */
export async function addToHistory(entry: HistoryEntry): Promise<void> {
  await Storage.setItem(KEY, (prev) => {
    const list: HistoryEntry[] = prev ? JSON.parse(prev) : [];
    return JSON.stringify([entry, ...list.filter((e) => e.raw !== entry.raw)].slice(0, MAX));
  });
}

/** Removes the list of past checks from this phone. Cached search results are separate and expire on their own. */
export async function clearHistory(): Promise<void> {
  await Storage.removeItem(KEY);
}

/** "just now", "5m ago", "3h ago", "2d ago". */
export function timeAgo(at: number, now = Date.now()): string {
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** One-line label for a history row: the number or link itself, or the start of a message. */
export function shortLabel(raw: string): string {
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length > 32 ? `${oneLine.slice(0, 31)}…` : oneLine;
}
