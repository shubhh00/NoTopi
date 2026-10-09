import type { VerdictLevel } from '@notopi/engine';

/** Paper-and-ink palette. Colour only appears for verdicts, so it carries meaning when it does. */
export const color = {
  paper: '#F3F0E8',
  ink: '#141414',
  muted: '#77736A',
  faint: '#A39E93',
  hairline: '#D9D4C7',
  marker: '#F2D74E',
  danger: '#C2321C',
  /** The icon's "topi." red, brighter than the verdict red; used for the wordmark. */
  brand: '#DC2A1E',
  /** Cards that sit on the paper: the input, the help card. */
  card: '#FBF9F4',
  dangerTint: '#F8E6E0',
  /** The selected tab: a shade darker than the paper. */
  pillActive: '#E6E0D2',
} as const;

/** Background, main text and secondary text for each verdict's full-bleed block. */
export const verdictColor: Record<VerdictLevel, { bg: string; fg: string; dim: string }> = {
  scam: { bg: '#C2321C', fg: '#FBEDE4', dim: '#F6C9B9' },
  suspicious: { bg: '#A9620B', fg: '#FDF1E0', dim: '#F3D2A6' },
  clean: { bg: '#2E6B3A', fg: '#EEF5EC', dim: '#BFD8C2' },
  unknown: { bg: '#141414', fg: '#F3F0E8', dim: '#A39E93' },
};

export const verdictWord: Record<VerdictLevel, string> = {
  scam: 'Scam.',
  suspicious: 'Suspicious.',
  clean: 'Looks clean.',
  unknown: "Can't tell yet.",
};

/** Names registered with useFonts in app/_layout.tsx. */
export const font = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  mono: 'GeistMono_400Regular',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, gutter: 20 } as const;

/**
 * One type scale for every screen. Serif line heights sit well above the font size so
 * descenders ("g", "p") are never clipped.
 */
export const type = {
  /** Screen headlines: "Something feel off?", "You're not in trouble." */
  display: { fontFamily: font.serif, fontSize: 42, lineHeight: 50, color: color.ink },
  /** The line under a headline. */
  lead: { fontFamily: font.sans, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: font.sans, fontSize: 16, lineHeight: 24 },
  /** Section headings within a screen: "Your message", "Why". Quiet, so the content leads. */
  heading: { fontFamily: font.sansMedium, fontSize: 15, lineHeight: 22, color: color.muted },
} as const;
