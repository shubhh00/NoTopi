import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hairline } from '@/components/ReceiptView';
import { Body, Mono, Serif, TextLink, Wordmark } from '@/components/ui';
import { EXAMPLES } from '@/lib/examples';
import { loadHistory, shortLabel, timeAgo, type HistoryEntry } from '@/lib/history';
import { useIncomingShare } from '@/lib/share';
import { color, font, space, type as t, verdictColor } from '@/theme';
import { isTextRecognitionAvailable } from '../../modules/text-recognizer';

const LEVEL_LABEL = { scam: 'Scam', suspicious: 'Suspicious', clean: 'Clean', unknown: 'Unsure' } as const;

export default function Home() {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const canCheck = text.trim().length > 0;

  // Reload history whenever we come back from a verdict.
  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, []),
  );

  const check = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    router.push({ pathname: '/check', params: { q } });
    setText('');
  };

  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (clip) setText(clip);
  };

  // Android's photo picker: no storage permission needed, the user picks one image.
  const pickScreenshot = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (!picked.canceled && picked.assets[0]) {
      router.push({ pathname: '/check', params: { image: picked.assets[0].uri } });
    }
  };

  useIncomingShare();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Wordmark />
            <TextLink label="Settings" tone="muted" onPress={() => router.push('/settings')} />
          </View>

          <Serif style={styles.headline}>Something feel off?</Serif>
          <Body style={styles.sub}>Check a message, number, link, app or shop before you trust it.</Body>

          {/* The main action: a real tap target, with the one solid button inside. */}
          <View style={styles.inputCard}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Paste or type it here"
              placeholderTextColor={color.faint}
              multiline
              textAlignVertical="top"
              style={styles.input}
              accessibilityLabel="Message, number, link, app or shop to check"
            />
            <View style={styles.inputActions}>
              {text ? <TextLink label="Clear" tone="muted" onPress={() => setText('')} /> : <TextLink label="Paste" onPress={paste} />}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canCheck }}
                onPress={() => check(text)}
                style={({ pressed }) => [styles.checkButton, !canCheck && { opacity: 0.25 }, pressed && canCheck && { opacity: 0.75 }]}
              >
                <Text style={styles.checkLabel}>Check  →</Text>
              </Pressable>
            </View>
          </View>

          {isTextRecognitionAvailable && (
            <View style={styles.links}>
              <TextLink label="Check a screenshot" onPress={pickScreenshot} />
            </View>
          )}

          <Body style={styles.tip}>
            <Text style={styles.tipStrong}>Faster: </Text>
            in any app, long-press a message → Share → NoTopi.
          </Body>

          {history.length > 0 ? (
            <View style={styles.section}>
              <Mono style={styles.sectionLabel}>Recent</Mono>
              {history.slice(0, 4).map((h, i) => (
                <View key={h.raw}>
                  {i > 0 && <Hairline />}
                  <Pressable onPress={() => check(h.raw)} style={({ pressed }) => [styles.historyRow, pressed && { opacity: 0.6 }]}>
                    <View style={[styles.dot, { backgroundColor: h.level === 'unknown' ? color.faint : verdictColor[h.level].bg }]} />
                    <Body numberOfLines={1} style={{ flex: 1 }}>{shortLabel(h.raw)}</Body>
                    <Mono style={styles.historyMeta}>{LEVEL_LABEL[h.level]} · {timeAgo(h.checkedAt)}</Mono>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.section}>
              <Mono style={styles.sectionLabel}>Try an example</Mono>
              <View style={styles.examples}>
                {EXAMPLES.map((e) => <TextLink key={e.label} label={e.label} onPress={() => check(e.text)} />)}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Pinned, never scrolled away: someone being threatened shouldn't have to look for help. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/help')}
          style={({ pressed }) => [styles.helpBar, pressed && { opacity: 0.85 }]}
        >
          <Body style={styles.helpText}>Being threatened or already paid?</Body>
          <Body style={styles.helpCta}>Get help →</Body>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.gutter, paddingBottom: space.xl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space.sm },
  headline: { ...t.display, marginTop: space.xl },
  sub: { ...t.lead, color: color.muted, marginTop: space.sm },
  inputCard: {
    marginTop: space.lg,
    backgroundColor: color.card,
    borderRadius: 16,
    padding: space.md,
    gap: space.md,
  },
  input: { minHeight: 88, maxHeight: 180, fontFamily: font.sans, fontSize: 17, lineHeight: 24, color: color.ink, padding: 0 },
  inputActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkButton: { backgroundColor: color.ink, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
  checkLabel: { fontFamily: font.sansMedium, fontSize: 15, color: color.paper },
  links: { flexDirection: 'row', marginTop: space.md },
  tip: { fontSize: 15, lineHeight: 22, color: color.muted, marginTop: space.lg },
  tipStrong: { fontFamily: font.sansMedium, color: color.ink },
  section: { marginTop: space.xl, gap: space.xs },
  sectionLabel: t.label,
  examples: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.sm, marginTop: space.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  historyMeta: { fontSize: 12 },
  helpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    backgroundColor: color.dangerTint,
    paddingHorizontal: space.gutter,
    paddingVertical: 14,
  },
  helpText: { fontSize: 15, color: color.danger, flex: 1 },
  helpCta: { fontFamily: font.sansMedium, fontSize: 15, color: color.danger },
});
