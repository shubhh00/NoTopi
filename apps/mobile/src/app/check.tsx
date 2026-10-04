import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { recognizeText } from '../../modules/text-recognizer';
import { Body, Mono, Serif } from '@/components/ui';
import { VerdictView } from '@/components/VerdictView';
import { describeQuery, planFor, runCheck, type CheckResult } from '@/lib/check';
import { addToHistory } from '@/lib/history';
import { loadSettings } from '@/lib/settings';
import { color, space } from '@/theme';

const READING_SCREENSHOT = 'Reading the screenshot';

/** Checks `q` (pasted or shared text) or `image` (a shared or picked screenshot, read with ML Kit first). */
export default function Check() {
  const { q = '', image } = useLocalSearchParams<{ q?: string; image?: string }>();
  // The text being checked: known straight away for text, after reading the image for screenshots.
  const [text, setText] = useState(image ? '' : q);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // One line per kind of search, ticked off as results come back.
  const steps = useMemo(
    () => [...(image ? [READING_SCREENSHOT] : []), ...(text ? new Set(planFor(text).map(describeQuery)) : [])],
    [image, text],
  );
  const tick = (step: string) => setDone((prev) => new Set(prev).add(step));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let raw = q;
        if (image) {
          raw = (await recognizeText(image)).trim();
          if (cancelled) return;
          if (!raw) throw new Error("Couldn't find any text in that image. Try pasting the message instead.");
          tick(READING_SCREENSHOT);
          setText(raw);
        }
        const settings = await loadSettings();
        const r = await runCheck(raw, settings, (query) => tick(describeQuery(query)));
        if (cancelled) return;
        setResult(r);
        await addToHistory({ raw, level: r.verdict.level, checkedAt: Date.now() });
        if (r.verdict.level === 'scam') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, image]);

  if (result) return <VerdictView result={result} />;

  return (
    <SafeAreaView style={styles.screen}>
      <Mono numberOfLines={2} style={{ color: color.ink }}>{text || 'Screenshot'}</Mono>
      <Serif style={styles.title}>{error ? 'That didn’t work.' : image && !text ? 'Reading it…' : 'Reading the web…'}</Serif>
      {error ? (
        <Body style={{ color: color.muted }}>{error}</Body>
      ) : (
        <View style={styles.steps}>
          {steps.map((s, i) => (
            <Animated.View key={s} entering={FadeIn.delay(i * 120)} style={styles.step}>
              <Mono style={{ color: done.has(s) ? color.ink : color.faint, width: 16 }}>{done.has(s) ? '✓' : '·'}</Mono>
              <Body style={{ color: done.has(s) ? color.ink : color.muted }}>{s}</Body>
            </Animated.View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper, paddingHorizontal: space.gutter, paddingTop: space.lg },
  title: { fontSize: 40, lineHeight: 44, marginTop: '30%', marginBottom: space.lg },
  steps: { gap: space.sm + 2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
