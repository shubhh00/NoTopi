import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, Mono, Serif, TextLink } from '@/components/ui';
import { loadSettings, type Settings } from '@/lib/settings';
import { fetchTrending, updatedLabel, type NewsArticle, type TrendingReport, type TrendingScam } from '@/lib/trending';
import { color, font, space, type as t } from '@/theme';

/** "10/09/2026, 05:42 AM" → "9 Oct". */
function shortDate(date: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(date);
  if (!m) return date;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[1]) - 1];
  return `${Number(m[2])} ${month}`;
}

/** The 7 days the report covers, ending on the day it was built: "4–10 October". */
function weekRange(report: TrendingReport): string {
  const end = new Date(report.updatedAt);
  if (Number.isNaN(end.getTime())) return '';
  const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
  const month = (d: Date) => d.toLocaleString('en-IN', { month: 'long' });
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${month(end)}`
    : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}`;
}

/** "10/09/2026, 05:42 AM" → "2026-10-09 05:42", so dates sort as text. */
function sortableDate(date: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:, (\d{1,2}):(\d{2}) (AM|PM))?/.exec(date);
  if (!m) return '';
  let hour = Number(m[4] ?? 0) % 12;
  if (m[6] === 'PM') hour += 12;
  return `${m[3]}-${m[1]}-${m[2]} ${String(hour).padStart(2, '0')}:${m[5] ?? '00'}`;
}

function newest(scam: TrendingScam): string {
  return scam.sources.map((a) => sortableDate(a.date)).sort().pop() ?? '';
}

/** Most widely reported first; among equals, the most recent report first. */
function byReportsThenDate(a: TrendingScam, b: TrendingScam): number {
  return b.sources.length - a.sources.length || newest(b).localeCompare(newest(a));
}

/** Newest article date among a scam's sources, for the card's label. */
function latestDate(scam: TrendingScam): string {
  const latest = [...scam.sources].sort((a, b) => sortableDate(b.date).localeCompare(sortableDate(a.date)))[0];
  return latest ? shortDate(latest.date) : '';
}

function SourceLine({ article }: { article: NewsArticle }) {
  return (
    <Pressable onPress={() => Linking.openURL(article.link)} style={({ pressed }) => [styles.sourceRow, pressed && { opacity: 0.6 }]}>
      <Body numberOfLines={2} style={styles.sourceTitle}>{article.title} <Body style={styles.arrow}>↗</Body></Body>
      <Mono style={styles.sourceMeta}>{article.source} · {shortDate(article.date)}</Mono>
    </Pressable>
  );
}

function ScamStory({ scam, index }: { scam: TrendingScam; index: number }) {
  const reports = `${scam.sources.length} ${scam.sources.length === 1 ? 'report' : 'reports'}`;
  const latest = latestDate(scam);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Mono style={styles.number}>{String(index + 1).padStart(2, '0')}</Mono>
        <Mono style={styles.kicker}>{reports}{latest ? ` · ${latest}` : ''}</Mono>
      </View>
      <Body style={styles.storyTitle}>{scam.name}</Body>
      <Body style={styles.storyText}>{scam.howItWorks}</Body>

      <Body style={styles.sectionLabel}>Reported in</Body>
      <View style={styles.sources}>
        {scam.sources.map((a) => <SourceLine key={a.link} article={a} />)}
      </View>

      <View style={styles.todo}>
        <Body style={styles.todoLabel}>What to do</Body>
        <Body style={styles.todoText}>{scam.whatToDo}</Body>
      </View>
    </View>
  );
}

/** This week's scams in Indian news, summarised by the NoTopi server with every source linked. */
export default function News() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [report, setReport] = useState<TrendingReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    const s = await loadSettings();
    setSettings(s);
    setReport(await fetchTrending(s, force));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(true)} tintColor={color.ink} />}
      >
        {/* When, then what, then details: a news-section header. */}
        <Body style={styles.eyebrow}>
          {report ? weekRange(report) : ' '}
          {report ? <Body style={styles.eyebrowMuted}>{`  ·  ${updatedLabel(report)}`}</Body> : null}
        </Body>
        <Serif style={styles.headline}>Scams this week</Serif>
        <Body style={styles.lead}>What police and the news are warning about in India, with every report linked.</Body>

        {settings && !settings.serverUrl ? (
          <View style={styles.empty}>
            <Body style={styles.emptyText}>The news feed comes from a NoTopi server. Add one in Settings to see it.</Body>
            <TextLink label="Open settings" onPress={() => router.push('/settings')} />
          </View>
        ) : report && report.scams.length > 0 ? (
          [...report.scams].sort(byReportsThenDate).map((s, i) => <ScamStory key={s.name} scam={s} index={i} />)
        ) : report && report.headlines.length > 0 ? (
          <View style={styles.card}>
            <Body style={styles.emptyText}>Summary coming soon. Today's scam headlines:</Body>
            <View style={styles.sources}>
              {report.headlines.slice(0, 10).map((a) => <SourceLine key={a.link} article={a} />)}
            </View>
          </View>
        ) : !loading ? (
          <View style={styles.empty}>
            <Body style={styles.emptyText}>No news yet. Pull down to refresh.</Body>
          </View>
        ) : null}

        {report && report.scams.length > 0 && (
          <Body style={styles.note}>
            Summarised from the news by an AI model; every point comes from the linked articles.
          </Body>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.xl },
  headline: { ...t.display, marginTop: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { fontFamily: font.sansMedium, fontSize: 14, lineHeight: 20, color: color.danger },
  eyebrowMuted: { fontFamily: font.sans, fontSize: 14, color: color.muted },
  lead: { ...t.lead, color: color.muted, marginTop: space.sm },
  // Each scam is its own card, so stories read as separate from the page heading.
  card: { marginTop: space.lg, backgroundColor: color.card, borderRadius: 16, padding: space.md + 4 },
  kicker: { fontSize: 12, color: color.muted },
  number: { fontSize: 12, color: color.danger },
  storyTitle: { fontFamily: font.sansMedium, fontSize: 20, lineHeight: 27, color: color.ink, marginTop: space.sm },
  storyText: { ...t.body, color: color.ink, marginTop: space.xs },
  sectionLabel: { fontFamily: font.sansMedium, fontSize: 13, color: color.muted, marginTop: space.lg },
  sources: { marginTop: space.sm, gap: space.md },
  sourceRow: { gap: 2 },
  sourceTitle: { fontSize: 14, lineHeight: 20, color: color.ink },
  arrow: { fontSize: 13, color: color.muted },
  sourceMeta: { fontSize: 12 },
  // The action closes the card, after the evidence, like the verdict screen.
  todo: {
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
    gap: 2,
  },
  todoLabel: { fontFamily: font.sansMedium, fontSize: 13, color: color.danger },
  todoText: { ...t.body, fontFamily: font.sansMedium, color: color.ink },
  empty: { marginTop: space.xl, gap: space.sm },
  emptyText: { ...t.body, color: color.muted },
  note: { fontSize: 13, lineHeight: 19, color: color.muted, marginTop: space.xl },
});
