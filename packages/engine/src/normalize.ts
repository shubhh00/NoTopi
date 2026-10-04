/** Lowercase, unify quotes and collapse whitespace so phrases match regardless of formatting. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Index of `phrase` in `text` (both already normalised), or -1.
 * A phrase that starts or ends with a letter or digit must sit on a word boundary there,
 * so "app" doesn't match inside "whatsapp" but ".apk" still matches "challan.apk".
 */
export function findPhrase(text: string, phrase: string): number {
  if (!phrase) return -1;
  const needsStart = WORD_CHAR.test(phrase[0]!);
  const needsEnd = WORD_CHAR.test(phrase[phrase.length - 1]!);
  let from = 0;
  while (true) {
    const i = text.indexOf(phrase, from);
    if (i === -1) return -1;
    const before = text[i - 1];
    const after = text[i + phrase.length];
    const startOk = !needsStart || before === undefined || !WORD_CHAR.test(before);
    const endOk = !needsEnd || after === undefined || !WORD_CHAR.test(after);
    if (startOk && endOk) return i;
    from = i + 1;
  }
}

export function containsPhrase(text: string, phrase: string): boolean {
  return findPhrase(text, normalizeText(phrase)) !== -1;
}

/** Case-insensitive position of `phrase` in an un-normalised string, for highlighting receipts. */
export function highlightRange(original: string, phrase: string): [number, number] | undefined {
  const i = original.toLowerCase().indexOf(phrase.toLowerCase());
  return i === -1 ? undefined : [i, i + phrase.length];
}

export function hostnameOf(url: string): string {
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}
