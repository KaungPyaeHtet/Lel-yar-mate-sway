import {
  analyzeWithRules,
  loadAggregatedHeadlines,
  verdictLabelForLocale,
  type NewsFilter,
  type NewsHeadline,
  type Verdict,
} from "@agriora/core";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useI18n } from "./LocaleContext";

const fg = "#e6ede8";
const muted = "rgba(230, 237, 232, 0.55)";
const accent = "#5cb87a";
const surface = "#141c17";
const bg = "#0c120f";

function formatWhen(ms: number, locale: "my" | "en") {
  if (!ms) return "";
  try {
    const loc = locale === "my" ? "my-MM" : "en-GB";
    return new Intl.DateTimeFormat(loc, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

export function NewsTab({ isActive }: { isActive: boolean }) {
  const { locale, t, tf } = useI18n();
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paragraph, setParagraph] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof analyzeWithRules
  > | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const h = await loadAggregatedHeadlines({
        filter,
        maxPerFeed: 10,
        maxTotal: 50,
      });
      setHeadlines(h);
    } catch (e) {
      setHeadlines([]);
      setErr(
        e instanceof Error ? e.message : t("errors.headlinesLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    if (isActive) void load();
  }, [isActive, load]);

  const chips: {
    id: NewsFilter;
    key: "news.filterAll" | "news.filterMyanmar" | "news.filterIntl";
  }[] = [
    { id: "all", key: "news.filterAll" },
    { id: "myanmar", key: "news.filterMyanmar" },
    { id: "international", key: "news.filterIntl" },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>{t("news.title")}</Text>
      <Text style={styles.hint}>{t("news.hint")}</Text>

      <View style={styles.chipRow}>
        {chips.map(({ id, key }) => (
          <Pressable
            key={id}
            style={[styles.chip, filter === id && styles.chipActive]}
            onPress={() => setFilter(id)}
          >
            <Text
              style={[styles.chipText, filter === id && styles.chipTextActive]}
            >
              {t(key)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.refresh}
        disabled={loading}
        onPress={() => void load()}
      >
        <Text style={styles.refreshText}>
          {loading ? t("news.loadingHeadlines") : t("news.refresh")}
        </Text>
      </Pressable>

      {err ? <Text style={styles.err}>{err}</Text> : null}

      {headlines.map((h) => (
        <View key={h.link} style={styles.newsItem}>
          <Text
            style={styles.newsTitle}
            onPress={() => void Linking.openURL(h.link)}
          >
            {h.title}
          </Text>
          <Text style={styles.newsMeta}>
            {h.feedLabel}
            {h.pubDateMs
              ? ` · ${formatWhen(h.pubDateMs, locale === "my" ? "my" : "en")}`
              : ""}
          </Text>
          <Pressable
            onPress={() =>
              setParagraph((p) =>
                p.trim() ? `${p.trim()}\n\n${h.title}` : h.title
              )
            }
          >
            <Text style={styles.useLink}>{t("news.addToHint")}</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.subheading}>{t("news.subheading")}</Text>
      <Text style={styles.hint}>{t("news.hintPaste")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("news.placeholder")}
        placeholderTextColor="rgba(230,237,232,0.35)"
        multiline
        value={paragraph}
        onChangeText={setParagraph}
      />
      <Pressable
        style={styles.btn}
        onPress={() => setResult(analyzeWithRules(paragraph))}
      >
        <Text style={styles.btnText}>{t("news.estimate")}</Text>
      </Pressable>

      {result && result.rows.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.resultLabel}>{t("news.resultLabel")}</Text>
          <Text
            style={[
              styles.resultMain,
              result.verdict === "up" && styles.up,
              result.verdict === "down" && styles.down,
            ]}
          >
            {verdictLabelForLocale(locale, result.verdict as Verdict)}
          </Text>
          <Text style={styles.meta}>
            {tf("news.blendMeta", {
              avg: result.avgBlend.toFixed(2),
              net: result.totalNet.toFixed(2),
              n: result.rows.length,
            })}
          </Text>
          {result.rows.map((r, i) => (
            <Text key={i} style={styles.rowLine}>
              • {r.text.length > 90 ? r.text.slice(0, 90) + "…" : r.text}
              {"\n"}
              <Text style={styles.rowSub}>
                blend {r.blend.toFixed(2)} (rules {r.net.toFixed(2)})
              </Text>
            </Text>
          ))}
        </View>
      )}
      {result && result.rows.length === 0 && (
        <Text style={styles.hint}>{t("news.addSentence")}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: fg,
    marginBottom: 8,
  },
  hint: { color: muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: {
    backgroundColor: accent,
    borderColor: accent,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "rgba(230,237,232,0.85)" },
  chipTextActive: { color: bg },
  refresh: { alignSelf: "flex-start", marginBottom: 10 },
  refreshText: { color: accent, fontWeight: "600", fontSize: 15 },
  err: { color: "#e89880", marginBottom: 10, fontSize: 14 },
  newsItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  newsTitle: {
    color: "#7dd89a",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 24,
  },
  newsMeta: {
    marginTop: 6,
    fontSize: 12,
    color: muted,
    lineHeight: 17,
  },
  useLink: {
    marginTop: 6,
    color: accent,
    fontSize: 13,
    fontWeight: "600",
  },
  subheading: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 17,
    fontWeight: "700",
    color: fg,
  },
  input: {
    backgroundColor: surface,
    borderRadius: 12,
    padding: 12,
    color: fg,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  btn: {
    backgroundColor: accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  btnText: { color: bg, fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  resultMain: { fontSize: 20, fontWeight: "700", color: fg, marginBottom: 8 },
  up: { color: "#7dd89a" },
  down: { color: "#e89880" },
  meta: { color: muted, fontSize: 13, marginBottom: 12 },
  rowLine: { color: fg, fontSize: 13, marginBottom: 10 },
  rowSub: { color: muted, fontSize: 12 },
});
