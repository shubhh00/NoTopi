import type { Signal, VerdictLevel } from '@notopi/engine';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CheckResult } from '@/lib/check';
import { shortLabel } from '@/lib/history';
import { color, space, type as t, verdictColor, verdictWord } from '@/theme';
import { MessageCard } from './MessageCard';
import { Hairline, ReceiptView } from './ReceiptView';
import { Body, Mono, PrimaryButton, Serif, TextLink } from './ui';

const GENERIC_ADVICE: Record<VerdictLevel, string> = {
  scam: "Don't pay, don't share OTPs, and don't open links in it.",
  suspicious: "There are warning signs. Don't pay or share anything until you've checked with the real company.",
  clean: 'We found proof this is genuine. Still, never share an OTP or your UPI PIN with anyone.',
  unknown: "We couldn't find reports either way. Treat it with care and don't share OTPs or pay in a hurry.",
};

/** Receipts that quote the user's own message; those are shown once, in the message card. */
const isOwnMessage = (site?: string) => site === 'Your message';

function points(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

function SignalRow({ signal }: { signal: Signal }) {
  const receipts = signal.receipts.filter((r) => !isOwnMessage(r.site)).slice(0, 2);
  return (
    <View style={styles.signal}>
      <View style={styles.signalHead}>
        <Body style={styles.signalLabel}>{signal.label}</Body>
        <Mono style={[styles.points, signal.points < 0 && { color: verdictColor.clean.bg }]}>{points(signal.points)}</Mono>
      </View>
      {receipts.map((r, i) => (
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
  const isMessage = verdict.input.kind === 'text';
  const ownReceipts = verdict.signals.flatMap((s) => s.receipts.filter((r) => isOwnMessage(r.site)));

  return (
    <View style={{ flex: 1 }}>
      {/* Every verdict colour is dark, so the clock and icons go light. */}
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
        <Animated.View entering={FadeIn.duration(250)} style={[styles.block, { backgroundColor: c.bg, paddingTop: insets.top + space.md }]}>
          <View style={styles.blockTop}>
            {/* A message is shown in full below; a number, link or name is shown here. */}
            <Mono style={{ color: c.dim, flex: 1 }} numberOfLines={1}>{isMessage ? '' : shortLabel(verdict.input.raw)}</Mono>
            <TextLink label="Close" textColor={c.fg} onPress={() => router.back()} />
          </View>
          <Animated.View entering={FadeInDown.delay(120).duration(450)}>
            <Serif italic style={[styles.word, { color: c.fg }]}>{verdictWord[verdict.level]}</Serif>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(350).duration(400)}>
            {verdict.pattern && (
              <Body style={[styles.patternName, { color: c.dim }]}>{verdict.pattern.pattern.name} scam</Body>
            )}
            <Body style={[styles.advice, { color: c.fg }]}>{advice}</Body>
            <View style={styles.risk} accessibilityLabel={`Risk ${verdict.score} out of 100`}>
              <Mono style={{ color: c.dim }}>Risk</Mono>
              <View style={[styles.riskTrack, { backgroundColor: c.dim + '55' }]}>
                <View style={[styles.riskFill, { width: `${verdict.score}%`, backgroundColor: c.fg }]} />
              </View>
              <Mono style={{ color: c.fg }}>{verdict.score}</Mono>
            </View>
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

          {isMessage && ownReceipts.length > 0 && (
            <View style={styles.section}>
              <Body style={t.heading}>Your message</Body>
              <MessageCard message={verdict.input.raw.trim()} receipts={ownReceipts} />
            </View>
          )}

          {verdict.signals.length > 0 ? (
            <View style={styles.section}>
              <Body style={t.heading}>Why</Body>
              {verdict.signals.map((s, i) => (
                <View key={s.id} style={{ gap: space.md }}>
                  {i > 0 && <Hairline />}
                  <SignalRow signal={s} />
                </View>
              ))}
            </View>
          ) : (
            <Body style={{ color: color.muted }}>No warning signs and no proof either way.</Body>
          )}
        </Animated.View>
      </ScrollView>

      {/* Keeps scrolled content from running under the clock, in the verdict's colour. */}
      <View pointerEvents="none" style={[styles.statusBackdrop, { height: insets.top, backgroundColor: c.bg }]} />

      <View style={[styles.actions, { paddingBottom: insets.bottom + space.md }]}>
        {risky ? (
          <>
            <PrimaryButton label="Call 1930" style={{ flex: 1 }} onPress={() => Linking.openURL('tel:1930')} />
            <TextLink
              label="What to do"
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
  // Line height well above the size so descenders (the p in "Suspicious.", the y in "yet") aren't clipped.
  word: { fontSize: 80, lineHeight: 96, marginTop: space.lg },
  patternName: { fontSize: 15, lineHeight: 22, marginTop: space.sm },
  advice: { fontSize: 18, lineHeight: 26, marginTop: space.md, maxWidth: 360 },
  risk: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  riskTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  riskFill: { height: 4, borderRadius: 2 },
  body: { paddingHorizontal: space.gutter, paddingTop: space.lg, gap: space.xl },
  section: { gap: space.md },
  signal: { gap: 2 },
  signalHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  signalLabel: { flex: 1 },
  points: { color: color.danger, fontSize: 13, paddingTop: 3 },
  notice: { backgroundColor: color.card, borderRadius: 16, padding: space.md, gap: space.sm },
  noticeText: { fontSize: 14, lineHeight: 20, color: color.muted },
  statusBackdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    backgroundColor: color.paper,
  },
});
