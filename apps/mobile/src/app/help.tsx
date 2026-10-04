import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, PrimaryButton, Serif, TextLink } from '@/components/ui';
import { db } from '@/lib/db';
import { color, space, type as t } from '@/theme';

/** Used when we don't know which scam it is: steps that are right for almost every case. */
const GENERAL = {
  headline: "You're not in trouble.",
  sub: "Scammers want you scared and in a hurry. Slow down. Here's what to do in the next hour.",
  steps: [
    'Stop replying. Hang up, and stop any screen sharing.',
    "Don't send money, OTPs, your UPI PIN or Aadhaar, whatever they threaten.",
    'Already paid? Call 1930 now. Money reported quickly can often be frozen.',
    'Save screenshots and numbers, then report it at cybercrime.gov.in.',
  ],
};

export default function Help() {
  const { pattern: patternId } = useLocalSearchParams<{ pattern?: string }>();
  const pattern = db.patterns.find((p) => p.id === patternId);
  const steps = pattern?.advice.steps ?? GENERAL.steps;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Opened from a verdict, which sets light icons for its coloured block. */}
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <TextLink label="Back" tone="muted" onPress={() => router.back()} />

        <Serif style={styles.headline}>{GENERAL.headline}</Serif>
        <Body style={styles.sub}>{pattern ? pattern.advice.verdict : GENERAL.sub}</Body>

        <View style={styles.steps}>
          {steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <Serif style={styles.num}>{i + 1}</Serif>
              <Body style={styles.stepText}>{step}</Body>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label="Call 1930" onPress={() => Linking.openURL('tel:1930')} />
        <View style={styles.secondary}>
          <TextLink label="Report it at cybercrime.gov.in" onPress={() => Linking.openURL('https://cybercrime.gov.in')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: space.xl },
  headline: { ...t.display, marginTop: space.xl },
  sub: { ...t.lead, color: color.muted, marginTop: space.sm },
  steps: { marginTop: space.xl, gap: space.lg },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  num: { fontSize: 32, lineHeight: 36, width: 24, marginTop: -4 },
  stepText: { ...t.body, flex: 1 },
  actions: { paddingHorizontal: space.gutter, paddingTop: space.sm, paddingBottom: space.md, gap: space.md },
  secondary: { alignItems: 'center' },
});
