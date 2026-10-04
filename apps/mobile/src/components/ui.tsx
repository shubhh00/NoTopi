import { Pressable, StyleSheet, Text, type PressableProps, type TextProps } from 'react-native';
import { color, font } from '@/theme';

/** The "no topi." wordmark, two-tone like the app icon. */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <Text accessibilityRole="header" accessibilityLabel="NoTopi" style={{ fontFamily: font.serifItalic, fontSize: size, lineHeight: size * 1.15 }}>
      <Text style={{ color: color.ink }}>no</Text>
      <Text style={{ color: color.brand }}>topi.</Text>
    </Text>
  );
}

/** Large editorial headings and the verdict word. */
export function Serif({ style, italic, ...rest }: TextProps & { italic?: boolean }) {
  return <Text {...rest} style={[{ fontFamily: italic ? font.serifItalic : font.serif, color: color.ink }, style]} />;
}

export function Body({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.body, style]} />;
}

/** Raw data: numbers, links, sources. */
export function Mono({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.mono, style]} />;
}

/** The one main action on a screen: a black pill. */
export function PrimaryButton({ label, style, ...rest }: PressableProps & { label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={(state) => [styles.primary, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  );
}

export function TextLink({
  label,
  tone = 'ink',
  textColor,
  ...rest
}: PressableProps & { label: string; tone?: 'ink' | 'muted' | 'danger'; textColor?: string }) {
  const c = textColor ?? (tone === 'danger' ? color.danger : tone === 'muted' ? color.muted : color.ink);
  return (
    <Pressable accessibilityRole="link" hitSlop={12} {...rest}>
      {({ pressed }) => <Text style={[styles.link, { color: c, opacity: pressed ? 0.6 : 1 }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 24, color: color.ink },
  mono: { fontFamily: font.mono, fontSize: 12, color: color.muted },
  primary: { backgroundColor: color.ink, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  primaryLabel: { fontFamily: font.sansMedium, fontSize: 15, color: color.paper },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  link: { fontFamily: font.sans, fontSize: 15, lineHeight: 22, textDecorationLine: 'underline' },
});
