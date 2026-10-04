import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Mono, Serif, TextLink } from '@/components/ui';
import { Hairline } from '@/components/ReceiptView';
import { loadHistory, shortLabel, type HistoryEntry } from '@/lib/history';
import { useIncomingShare } from '@/lib/share';
import { isTextRecognitionAvailable } from '../../modules/text-recognizer';
import { color, font, space, verdictColor } from '@/theme';

const LEVEL_LABEL = { scam: 'Scam', suspicious: 'Suspicious', clean: 'Clean', unknown: 'Unsure' } as const;

export default function Home() {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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
            <Serif italic style={styles.wordmark}>notopi</Serif>
            <TextLink label="Settings" tone="muted" onPress={() => router.push('/settings')} />
          </View>

          <View style={styles.hero}>
            <Serif style={styles.headline}>Something feel off?</Serif>
            <Body style={styles.sub}>
              Paste a message, number, link, app or shop name. Or share it here from any app.
            </Body>

            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Paste here"
                placeholderTextColor={color.faint}
                multiline
                style={styles.input}
                accessibilityLabel="Message, number, link or app to check"
              />
              {text ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Check"
                  onPress={() => check(text)}
                  style={({ pressed }) => [styles.go, pressed && { opacity: 0.7 }]}
                >
                  <Body style={styles.goArrow}>→</Body>
                </Pressable>
              ) : (
                <TextLink label="Paste" onPress={paste} />
              )}
            </View>
            {isTextRecognitionAvailable && (
              <View style={styles.secondary}>
                <TextLink label="Check a screenshot" tone="muted" onPress={pickScreenshot} />
              </View>
            )}
          </View>

          {history.length > 0 && (
            <View style={styles.history}>
              {history.slice(0, 6).map((h, i) => (
                <View key={h.raw}>
                  {i > 0 && <Hairline />}
                  <Pressable
                    onPress={() => check(h.raw)}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
                  >
                    <Mono style={styles.rowLabel} numberOfLines={1}>{shortLabel(h.raw)}</Mono>
                    <Body style={[styles.rowLevel, { color: h.level === 'unknown' ? color.muted : verdictColor[h.level].bg }]}>
                      {LEVEL_LABEL[h.level]}
                    </Body>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <TextLink label="Being threatened right now?" tone="danger" onPress={() => router.push('/help')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { flexGrow: 1, paddingHorizontal: space.gutter, paddingBottom: space.lg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: space.md },
  wordmark: { fontSize: 28 },
  hero: { marginTop: '28%' },
  headline: { fontSize: 46, lineHeight: 48 },
  sub: { color: color.muted, marginTop: space.md, maxWidth: 300 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
    marginTop: space.xl,
    borderBottomWidth: 1,
    borderBottomColor: color.ink,
    paddingBottom: space.sm,
  },
  input: { flex: 1, fontFamily: font.sans, fontSize: 17, color: color.ink, maxHeight: 140, paddingVertical: 6 },
  secondary: { marginTop: space.md, alignItems: 'flex-start' },
  go: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
  goArrow: { color: color.paper, fontSize: 20, lineHeight: 22 },
  history: { marginTop: space.xl + space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, gap: space.md },
  rowLabel: { flex: 1, fontSize: 13, color: color.ink },
  rowLevel: { fontSize: 14 },
  footer: { marginTop: 'auto', paddingTop: space.xl },
});
