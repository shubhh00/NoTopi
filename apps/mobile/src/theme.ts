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
