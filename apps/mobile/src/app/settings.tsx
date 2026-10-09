import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, PrimaryButton, Serif, TextLink } from '@/components/ui';
import { loadSettings, normalizeServerUrl, saveSettings, serverUrlProblem } from '@/lib/settings';
import { color, font, space, type as t } from '@/theme';

export default function Settings() {
  const [key, setKey] = useState('');
  const [server, setServer] = useState('');

  useEffect(() => {
    loadSettings().then((s) => {
      setKey(s.serpApiKey ?? '');
      setServer(s.serverUrl ?? '');
    });
  }, []);

  const serverProblem = serverUrlProblem(normalizeServerUrl(server));

  const save = async () => {
    await saveSettings({ serpApiKey: key || null, serverUrl: server || null });
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Can be opened from a verdict, which sets light icons for its coloured block. */}
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextLink label="Back" tone="muted" onPress={() => router.back()} />
        <View>
          <Serif style={styles.headline}>Settings</Serif>
          <Body style={styles.lead}>
            Without these, NoTopi still checks the wording of messages and links. Add one to also search the web and
            police warnings for reports.
          </Body>
        </View>

        <View style={styles.field}>
          <Body style={t.heading}>SerpApi key</Body>
          <TextInput
            value={key}
            onChangeText={setKey}
            placeholder="Paste your key"
            placeholderTextColor={color.faint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={styles.input}
          />
          <Body style={styles.help}>
            NoTopi searches Google, police and government sites, and the Play Store through SerpApi. Your key stays on this phone.
          </Body>
          <TextLink label="Get a free key at serpapi.com" onPress={() => Linking.openURL('https://serpapi.com/users/sign_up')} />
        </View>

        <View style={styles.field}>
          <Body style={t.heading}>NoTopi server (optional)</Body>
          <TextInput
            value={server}
            onChangeText={setServer}
            placeholder="http://localhost:8080"
            placeholderTextColor={color.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          {serverProblem && <Body style={styles.problem}>{serverProblem}</Body>}
          <Body style={styles.help}>
            If set, searches go through this server instead, and your key isn't needed. Over USB, use
            http://localhost:8080.
          </Body>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label="Save" onPress={save} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.gutter, paddingTop: space.md, gap: space.xl },
  headline: { ...t.display },
  lead: { ...t.lead, color: color.muted, marginTop: space.sm },
  field: { gap: space.sm },
  input: {
    fontFamily: font.mono,
    fontSize: 15,
    color: color.ink,
    backgroundColor: color.card,
    borderRadius: 12,
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
  help: { fontSize: 15, lineHeight: 22, color: color.muted },
  problem: { fontSize: 15, lineHeight: 22, color: color.danger },
  actions: { paddingHorizontal: space.gutter, paddingBottom: space.md },
});
