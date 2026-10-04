import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, OutlineButton, PrimaryButton, Serif, TextLink } from '@/components/ui';
import { db } from '@/lib/db';
import { color, space } from '@/theme';

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
        <OutlineButton label="Report at cybercrime.gov.in" onPress={() => Linking.openURL('https://cybercrime.gov.in')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: space.xl },
  headline: { fontSize: 46, lineHeight: 48, marginTop: space.xl + space.md },
  sub: { color: color.muted, marginTop: space.md },
  steps: { marginTop: space.xl, gap: space.lg },
  step: { flexDirection: 'row', gap: space.md },
  num: { fontSize: 34, lineHeight: 34, width: 22 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 23 },
  actions: { paddingHorizontal: space.gutter, paddingBottom: space.md, gap: space.sm },
});
