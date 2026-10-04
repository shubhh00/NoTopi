import type { Receipt } from '@notopi/engine';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, space } from '@/theme';

/** The phrase a receipt highlights, e.g. "SIR investigation". */
function highlightedPhrase(r: Receipt): string | undefined {
  return r.highlight ? r.quote.slice(r.highlight[0], r.highlight[1]) : undefined;
}

/** Every place any of `phrases` occurs in `text` (ignoring case), merged into non-overlapping ranges. */
function rangesOf(text: string, phrases: string[]): Array<[number, number]> {
  const lower = text.toLowerCase();
  const found: Array<[number, number]> = [];
  for (const p of phrases) {
    const needle = p.toLowerCase();
    if (!needle) continue;
    for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, i + needle.length)) {
      found.push([i, i + needle.length]);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of found) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

/**
 * The checked message shown once, with every phrase that raised a flag marked like a
 * highlighter, instead of quoting the message again under each reason.
 */
export function MessageCard({ message, receipts }: { message: string; receipts: Receipt[] }) {
  const phrases = receipts.map(highlightedPhrase).filter((p): p is string => Boolean(p));
  const ranges = rangesOf(message, phrases);
  const parts: Array<{ text: string; marked: boolean }> = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push({ text: message.slice(at, start), marked: false });
    parts.push({ text: message.slice(start, end), marked: true });
    at = end;
  }
  if (at < message.length) parts.push({ text: message.slice(at), marked: false });

  return (
    <View style={styles.card}>
      <Text style={styles.text}>
        {parts.map((p, i) => (
          <Text key={i} style={p.marked ? styles.marked : undefined}>{p.text}</Text>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.card, borderRadius: 16, padding: space.md },
  text: { fontFamily: font.sans, fontSize: 16, lineHeight: 25, color: color.ink },
  marked: { backgroundColor: color.marker },
});
