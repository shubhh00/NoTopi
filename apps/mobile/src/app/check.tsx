import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Mono, Serif } from '@/components/ui';
import { VerdictView } from '@/components/VerdictView';
import { describeQuery, planFor, runCheck, type CheckResult } from '@/lib/check';
import { addToHistory } from '@/lib/history';
import { loadSettings } from '@/lib/settings';
import { color, space } from '@/theme';

export default function Check() {
  const { q = '' } = useLocalSearchParams<{ q: string }>();
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // One line per kind of search, ticked off as results come back.
  const steps = useMemo(() => [...new Set(planFor(q).map(describeQuery))], [q]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await loadSettings();
        const r = await runCheck(q, settings, (query) =>
          setDone((prev) => new Set(prev).add(describeQuery(query))),
        );
        if (cancelled) return;
        setResult(r);
        await addToHistory({ raw: q, level: r.verdict.level, checkedAt: Date.now() });
        if (r.verdict.level === 'scam') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  if (result) return <VerdictView result={result} />;

  return (
    <SafeAreaView style={styles.screen}>
      <Mono numberOfLines={2} style={{ color: color.ink }}>{q}</Mono>
      <Serif style={styles.title}>{error ? 'That didn’t work.' : 'Reading the web…'}</Serif>
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
