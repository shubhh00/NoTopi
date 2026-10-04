import type { Signal, VerdictLevel } from '@notopi/engine';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CheckResult } from '@/lib/check';
import { shortLabel } from '@/lib/history';
import { color, space, verdictColor, verdictWord } from '@/theme';
import { ReceiptView } from './ReceiptView';
import { Body, Mono, OutlineButton, PrimaryButton, Serif, TextLink } from './ui';

const GENERIC_ADVICE: Record<VerdictLevel, string> = {
  scam: "Don't pay, don't share OTPs, and don't open links in it.",
  suspicious: "There are warning signs. Don't pay or share anything until you've checked with the real company.",
  clean: 'We found proof this is genuine. Still, never share an OTP or your UPI PIN with anyone.',
  unknown: "We couldn't find reports either way. Treat it with care and don't share OTPs or pay in a hurry.",
};

function points(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <View style={styles.signal}>
      <View style={styles.signalHead}>
        <Body style={styles.signalLabel}>{signal.label}</Body>
        <Mono style={[styles.points, signal.points < 0 && { color: verdictColor.clean.bg }]}>{points(signal.points)}</Mono>
      </View>
      {signal.receipts.slice(0, 2).map((r, i) => (
        <View key={i} style={{ marginTop: space.sm }}>
          <ReceiptView receipt={r} />
        </View>
      ))}
    </View>
  );
}

export function VerdictView({ result }: { result: CheckResult }) {
  const insets = useSafeAreaInsets();
  const { verdict } = result;
  const c = verdictColor[verdict.level];
  const risky = verdict.level === 'scam' || verdict.level === 'suspicious';
  const advice = verdict.pattern?.pattern.advice.verdict ?? GENERIC_ADVICE[verdict.level];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
        <Animated.View entering={FadeIn.duration(250)} style={[styles.block, { backgroundColor: c.bg, paddingTop: insets.top + space.md }]}>
          <View style={styles.blockTop}>
            <Mono style={{ color: c.dim, flex: 1 }} numberOfLines={1}>{shortLabel(verdict.input.raw)}</Mono>
            <TextLink label="Close" tone="muted" onPress={() => router.back()} />
          </View>
          <Animated.View entering={FadeInDown.delay(120).duration(450)}>
            <Serif italic style={[styles.word, { color: c.fg }]}>{verdictWord[verdict.level]}</Serif>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(350).duration(400)}>
            {verdict.pattern && (
              <Body style={[styles.patternName, { color: c.fg }]}>
                Looks like the “{verdict.pattern.pattern.name}” scam.
              </Body>
            )}
            <Body style={[styles.advice, { color: c.fg }]}>{advice}</Body>
            <Mono style={{ color: c.dim, marginTop: space.md }}>Risk {verdict.score} / 100</Mono>
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.body}>
          {result.search === 'no-key' && (
            <View style={styles.notice}>
              <Body style={styles.noticeText}>
                Checked offline. Add a SerpApi key or a NoTopi server to search the web and police warnings for reports.
              </Body>
              <TextLink label="Open settings" onPress={() => router.push('/settings')} />
            </View>
          )}
          {result.search === 'failed' && (
            <View style={styles.notice}>
              <Body style={styles.noticeText}>
                Couldn't search the web{result.searchError ? ` (${result.searchError})` : ''}, so this was checked offline.
                If you use a NoTopi server, check it's running and reachable from this phone.
              </Body>
              <TextLink label="Open settings" onPress={() => router.push('/settings')} />
            </View>
          )}

          {verdict.signals.length > 0 ? (
            <>
              <Mono style={styles.section}>Why</Mono>
              {verdict.signals.map((s) => <SignalRow key={s.id} signal={s} />)}
            </>
          ) : (
            <Body style={{ color: color.muted }}>No warning signs and no proof either way.</Body>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + space.md }]}>
        {risky ? (
          <>
            <PrimaryButton label="Call 1930" style={{ flex: 1 }} onPress={() => Linking.openURL('tel:1930')} />
            <OutlineButton
              label="What to do"
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/help', params: { pattern: verdict.pattern?.pattern.id ?? '' } })}
            />
          </>
        ) : (
          <PrimaryButton label="Check something else" style={{ flex: 1 }} onPress={() => router.back()} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: space.gutter, paddingBottom: space.xl },
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  word: { fontSize: 84, lineHeight: 86, marginTop: space.xl + space.md },
  patternName: { fontSize: 17, marginTop: space.md },
  advice: { fontSize: 16, lineHeight: 23, marginTop: space.sm, maxWidth: 340 },
  body: { paddingHorizontal: space.gutter, paddingTop: space.lg, gap: space.lg },
  section: { marginBottom: -space.sm },
  signal: { gap: 2 },
  signalHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  signalLabel: { flex: 1 },
  points: { color: color.danger, fontSize: 13, paddingTop: 3 },
  notice: { borderWidth: 1, borderColor: color.hairline, borderRadius: 12, padding: space.md, gap: space.sm },
  noticeText: { fontSize: 14, lineHeight: 20, color: color.muted },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    backgroundColor: color.paper,
  },
});
