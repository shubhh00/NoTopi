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

/** One-line label for a history row: the number or link itself, or the start of a message. */
export function shortLabel(raw: string): string {
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  return oneLine.length > 32 ? `${oneLine.slice(0, 31)}…` : oneLine;
}
