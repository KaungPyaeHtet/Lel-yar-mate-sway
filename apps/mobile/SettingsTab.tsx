import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useI18n } from "./LocaleContext";
import { UiText } from "./UiText";
import { myLh, theme } from "./theme";

export function SettingsTab() {
  const { locale, setLocale, t } = useI18n();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.titleRow}>
        <Ionicons
          name="settings-outline"
          size={28}
          color={theme.accent}
          style={styles.titleIcon}
        />
        <UiText style={styles.pageTitle}>{t("settings.title")}</UiText>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionLabelRow}>
          <Ionicons name="language-outline" size={16} color={theme.fgMuted} />
          <UiText style={styles.sectionLabel}>{t("settings.languageTitle")}</UiText>
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
              <UiText
                style={[
                  styles.langBtnText,
                  locale === "my" && styles.langBtnTextActive,
                ]}
              >
                {t("settings.languageMy")}
              </UiText>
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
              <UiText
                style={[
                  styles.langBtnText,
                  locale === "en" && styles.langBtnTextActive,
                ]}
              >
                {t("settings.languageEn")}
              </UiText>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.subheadingRow}>
        <Ionicons
          name="information-circle-outline"
          size={22}
          color={theme.accent}
          style={styles.subheadingIcon}
        />
        <UiText style={styles.subheading}>{t("about.title")}</UiText>
      </View>
      <View style={styles.card}>
        <UiText style={styles.body}>{t("about.body")}</UiText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  titleIcon: { marginTop: 4 },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.fg,
    flex: 1,
    flexShrink: 1,
    lineHeight: myLh(24),
    paddingTop: 2,
  },
  subheadingRow: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  subheadingIcon: { marginTop: 3 },
  subheading: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.fg,
    flex: 1,
    flexShrink: 1,
    lineHeight: myLh(18),
    paddingTop: 2,
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
    lineHeight: myLh(12),
  },
  langRow: { flexDirection: "row", gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 16,
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
  langBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: myLh(16),
  },
  langBtnTextActive: { color: theme.onAccent },
  body: { color: theme.fgMuted, fontSize: 16, lineHeight: myLh(16) },
});
