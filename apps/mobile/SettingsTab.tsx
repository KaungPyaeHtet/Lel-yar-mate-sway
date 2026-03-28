import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "./LocaleContext";

const fg = "#e6ede8";
const muted = "rgba(230, 237, 232, 0.55)";
const accent = "#5cb87a";
const surface = "#141c17";
const bg = "#0c120f";

export function SettingsTab() {
  const { locale, setLocale, t } = useI18n();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.pageTitle}>{t("settings.title")}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t("settings.languageTitle")}</Text>
        <View style={styles.langRow}>
          <Pressable
            style={[styles.langBtn, locale === "my" && styles.langBtnActive]}
            onPress={() => setLocale("my")}
          >
            <Text
              style={[
                styles.langBtnText,
                locale === "my" && styles.langBtnTextActive,
              ]}
            >
              {t("settings.languageMy")}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, locale === "en" && styles.langBtnActive]}
            onPress={() => setLocale("en")}
          >
            <Text
              style={[
                styles.langBtnText,
                locale === "en" && styles.langBtnTextActive,
              ]}
            >
              {t("settings.languageEn")}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.note}>{t("settings.languageNote")}</Text>
      </View>

      <Text style={styles.subheading}>{t("about.title")}</Text>
      <View style={styles.card}>
        <Text style={styles.body}>{t("about.body")}</Text>
      </View>
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
    marginBottom: 12,
  },
  subheading: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 17,
    fontWeight: "700",
    color: fg,
  },
  card: {
    backgroundColor: surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  langRow: { flexDirection: "row", gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: bg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  langBtnActive: {
    backgroundColor: accent,
    borderColor: accent,
  },
  langBtnText: { fontSize: 15, fontWeight: "700", color: fg },
  langBtnTextActive: { color: bg },
  note: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: muted,
  },
  body: { color: muted, fontSize: 15, lineHeight: 22 },
});
