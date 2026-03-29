import {
  analyzeWithRules,
  loadAggregatedHeadlines,
  verdictLabelForLocale,
  type NewsFilter,
  type NewsHeadline,
  type Verdict,
} from "@agriora/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState, type ComponentProps } from "react";
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
import { theme } from "./theme";

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
    icon: ComponentProps<typeof Ionicons>["name"];
  }[] = [
    { id: "all", key: "news.filterAll", icon: "earth-outline" },
    { id: "myanmar", key: "news.filterMyanmar", icon: "flag-outline" },
    { id: "international", key: "news.filterIntl", icon: "globe-outline" },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Ionicons name="newspaper-outline" size={28} color={theme.accent} />
        <Text style={styles.pageTitle}>{t("news.title")}</Text>
      </View>
      <Text style={styles.hint}>{t("news.hint")}</Text>

      <View style={styles.chipRow}>
        {chips.map(({ id, key, icon }) => (
          <Pressable
            key={id}
            style={[styles.chip, filter === id && styles.chipActive]}
            onPress={() => setFilter(id)}
          >
            <View style={styles.chipInner}>
              <Ionicons
                name={icon}
                size={16}
                color={filter === id ? theme.onAccent : theme.chipInactiveFg}
              />
              <Text
                style={[styles.chipText, filter === id && styles.chipTextActive]}
              >
                {t(key)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.refresh}
        disabled={loading}
        onPress={() => void load()}
      >
        <Ionicons name="refresh-outline" size={18} color={theme.accent} />
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
        placeholderTextColor={theme.placeholder}
        multiline
        value={paragraph}
        onChangeText={setParagraph}
      />
      <Pressable
        style={styles.btn}
        onPress={() => setResult(analyzeWithRules(paragraph))}
      >
        <View style={styles.btnInner}>
          <Ionicons name="analytics-outline" size={22} color={theme.onAccent} />
          <Text style={styles.btnText}>{t("news.estimate")}</Text>
        </View>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.fg,
    flex: 1,
  },
  hint: {
    color: theme.fgMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  chipInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.chipInactiveFg,
  },
  chipTextActive: { color: theme.onAccent },
  refresh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  refreshText: { color: theme.accent, fontWeight: "700", fontSize: 15 },
  err: { color: theme.warn, marginBottom: 10, fontSize: 15 },
  newsItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  newsTitle: {
    color: theme.link,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  newsMeta: {
    marginTop: 6,
    fontSize: 13,
    color: theme.fgMuted,
    lineHeight: 18,
  },
  useLink: {
    marginTop: 6,
    color: theme.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  subheading: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: "700",
    color: theme.fg,
  },
  input: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: theme.fg,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: theme.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    minHeight: 52,
    justifyContent: "center",
  },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: { color: theme.onAccent, fontWeight: "700", fontSize: 17 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.fgMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  resultMain: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.fg,
    marginBottom: 8,
  },
  up: { color: theme.success },
  down: { color: theme.warn },
  meta: { color: theme.fgMuted, fontSize: 14, marginBottom: 12 },
  rowLine: { color: theme.fg, fontSize: 14, marginBottom: 10 },
  rowSub: { color: theme.fgMuted, fontSize: 13 },
});
