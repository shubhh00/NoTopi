import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Mono, PrimaryButton, Serif, TextLink } from '@/components/ui';
import { loadSettings, saveSettings } from '@/lib/settings';
import { color, font, space } from '@/theme';

export default function Settings() {
  const [key, setKey] = useState('');
  const [server, setServer] = useState('');

  useEffect(() => {
    loadSettings().then((s) => {
      setKey(s.serpApiKey ?? '');
      setServer(s.serverUrl ?? '');
    });
  }, []);

  const save = async () => {
    await saveSettings({ serpApiKey: key || null, serverUrl: server || null });
    router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextLink label="Back" tone="muted" onPress={() => router.back()} />
        <Serif style={styles.headline}>Settings</Serif>

        <View style={styles.field}>
          <Mono>SerpApi key</Mono>
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
            NoTopi searches Google, News and the Play Store through SerpApi. Your key stays on this phone.
          </Body>
          <TextLink label="Get a free key at serpapi.com" onPress={() => Linking.openURL('https://serpapi.com/users/sign_up')} />
        </View>

        <View style={styles.field}>
          <Mono>NoTopi server (optional)</Mono>
          <TextInput
            value={server}
            onChangeText={setServer}
            placeholder="https://your-server.example"
            placeholderTextColor={color.faint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <Body style={styles.help}>
            If set, searches go through this server instead, and your key isn't needed.
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
  headline: { fontSize: 46, lineHeight: 48, marginTop: space.md },
  field: { gap: space.sm },
  input: {
    fontFamily: font.mono,
    fontSize: 15,
    color: color.ink,
    borderBottomWidth: 1,
    borderBottomColor: color.ink,
    paddingVertical: space.sm,
  },
  help: { fontSize: 14, lineHeight: 20, color: color.muted },
  actions: { paddingHorizontal: space.gutter, paddingBottom: space.md },
});
