import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "./LocaleContext";
import { theme } from "./theme";

export function SettingsTab() {
  const { locale, setLocale, t } = useI18n();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.titleRow}>
        <Ionicons name="settings-outline" size={28} color={theme.accent} />
        <Text style={styles.pageTitle}>{t("settings.title")}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="language-outline" size={16} color={theme.fgMuted} />
          <Text style={styles.sectionLabel}>{t("settings.languageTitle")}</Text>
        </View>
        <View style={styles.langRow}>
          <Pressable
            style={[styles.langBtn, locale === "my" && styles.langBtnActive]}
            onPress={() => setLocale("my")}
          >
            <View style={styles.langBtnInner}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={locale === "my" ? theme.onAccent : theme.fg}
              />
              <Text
                style={[
                  styles.langBtnText,
                  locale === "my" && styles.langBtnTextActive,
                ]}
              >
                {t("settings.languageMy")}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.langBtn, locale === "en" && styles.langBtnActive]}
            onPress={() => setLocale("en")}
          >
            <View style={styles.langBtnInner}>
              <Ionicons
                name="text-outline"
                size={18}
                color={locale === "en" ? theme.onAccent : theme.fg}
              />
              <Text
                style={[
                  styles.langBtnText,
                  locale === "en" && styles.langBtnTextActive,
                ]}
              >
                {t("settings.languageEn")}
              </Text>
            </View>
          </Pressable>
        </View>
        <Text style={styles.note}>{t("settings.languageNote")}</Text>
      </View>

      <View style={styles.subheadingRow}>
        <Ionicons name="information-circle-outline" size={22} color={theme.accent} />
        <Text style={styles.subheading}>{t("about.title")}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.body}>{t("about.body")}</Text>
      </View>
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
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.fg,
    flex: 1,
  },
  subheadingRow: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subheading: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.fg,
    flex: 1,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.fgMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  langRow: { flexDirection: "row", gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  langBtnActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  langBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  langBtnText: { fontSize: 16, fontWeight: "700", color: theme.fg },
  langBtnTextActive: { color: theme.onAccent },
  note: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: theme.fgMuted,
  },
  body: { color: theme.fgMuted, fontSize: 16, lineHeight: 24 },
});
