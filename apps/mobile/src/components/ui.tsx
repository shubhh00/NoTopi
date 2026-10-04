import { Pressable, StyleSheet, Text, type PressableProps, type TextProps } from 'react-native';
import { color, font } from '@/theme';

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

/** Secondary actions: an outlined pill. */
export function OutlineButton({ label, style, ...rest }: PressableProps & { label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={(state) => [styles.outline, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
    >
      <Text style={styles.outlineLabel}>{label}</Text>
    </Pressable>
  );
}

export function TextLink({ label, tone = 'ink', ...rest }: PressableProps & { label: string; tone?: 'ink' | 'muted' | 'danger' }) {
  const c = tone === 'danger' ? color.danger : tone === 'muted' ? color.muted : color.ink;
  return (
    <Pressable accessibilityRole="link" hitSlop={12} {...rest}>
      {({ pressed }) => <Text style={[styles.link, { color: c, opacity: pressed ? 0.6 : 1 }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.sans, fontSize: 15, lineHeight: 22, color: color.ink },
  mono: { fontFamily: font.mono, fontSize: 12, color: color.muted },
  primary: { backgroundColor: color.ink, borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  primaryLabel: { fontFamily: font.sansMedium, fontSize: 15, color: color.paper },
  outline: { borderWidth: 1, borderColor: color.ink, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  outlineLabel: { fontFamily: font.sansMedium, fontSize: 15, color: color.ink },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  link: { fontFamily: font.sans, fontSize: 14, textDecorationLine: 'underline' },
});
