import {
  loadAggregatedHeadlines,
  type NewsFilter,
  type NewsHeadline,
} from "@agriora/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState, type ComponentProps } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        </View>
      ))}
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
});
