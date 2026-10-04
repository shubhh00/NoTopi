import type { Receipt } from '@notopi/engine';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font } from '@/theme';
import { Mono } from './ui';

/** A quote from the evidence with the phrase that triggered the rule marked like a highlighter. */
export function ReceiptView({ receipt }: { receipt: Receipt }) {
  const { quote, highlight } = receipt;
  const parts = highlight
    ? [quote.slice(0, highlight[0]), quote.slice(highlight[0], highlight[1]), quote.slice(highlight[1])]
    : [quote, '', ''];
  const source = [receipt.site, receipt.date].filter(Boolean).join(' · ');

  return (
    <Pressable
      disabled={!receipt.link}
      onPress={() => receipt.link && Linking.openURL(receipt.link)}
      style={({ pressed }) => [styles.receipt, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.quote}>
        {parts[0]}
        {parts[1] ? <Text style={styles.marked}>{parts[1]}</Text> : null}
        {parts[2]}
      </Text>
      {source ? <Mono style={styles.source}>{source}{receipt.link ? ' ↗' : ''}</Mono> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  receipt: { borderLeftWidth: 2, borderLeftColor: color.ink, paddingLeft: 12, paddingVertical: 2 },
  quote: { fontFamily: font.sans, fontSize: 14, lineHeight: 21, color: color.ink },
  marked: { backgroundColor: color.marker },
  source: { marginTop: 6 },
});

export function Hairline() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.hairline }} />;
}
