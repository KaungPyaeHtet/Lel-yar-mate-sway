import {
  FARMING_LIVESTOCK_ITEMS,
  FARMING_PLANT_ITEMS,
} from "@agriora/core";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MarketTab } from "./MarketTab";
import { useI18n } from "./LocaleContext";
import { UiText } from "./UiText";
import { myLh, theme } from "./theme";

type FarmingScope = "plants" | "animals";

function AnimalsPlaceholder() {
  const { t } = useI18n();
  return (
    <View style={styles.animalsCard}>
      <UiText style={styles.animalsTitle}>{t("farming.animalsTitle")}</UiText>
      <UiText style={styles.animalsBody}>{t("farming.animalsBody")}</UiText>
    </View>
  );
}

/**
 * စိုက်ပျိုးရေး (veg/fruit + workbook) vs မွေးမြူရေး (meat, fish, eggs from WFP CSV).
 */
export function FarmingTab() {
  const { t } = useI18n();
  const [scope, setScope] = useState<FarmingScope>("plants");
  const hasLivestockData = FARMING_LIVESTOCK_ITEMS.length > 0;

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Ionicons
          name="storefront-outline"
          size={28}
          color={theme.accent}
          style={styles.titleIcon}
        />
        <UiText style={styles.pageTitle}>{t("farming.title")}</UiText>
      </View>

      <View
        style={styles.segments}
        accessibilityRole="tablist"
        accessibilityLabel={t("farming.title")}
      >
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: scope === "plants" }}
          onPress={() => setScope("plants")}
          style={({ pressed }) => [
            styles.segment,
            scope === "plants" && styles.segmentActive,
            pressed && styles.segmentPressed,
          ]}
        >
          <UiText
            style={[
              styles.segmentText,
              scope === "plants" && styles.segmentTextActive,
            ]}
            numberOfLines={1}
          >
            {t("farming.segmentPlants")}
          </UiText>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: scope === "animals" }}
          onPress={() => setScope("animals")}
          style={({ pressed }) => [
            styles.segment,
            scope === "animals" && styles.segmentActive,
            pressed && styles.segmentPressed,
          ]}
        >
          <UiText
            style={[
              styles.segmentText,
              scope === "animals" && styles.segmentTextActive,
            ]}
            numberOfLines={1}
          >
            {t("farming.segmentAnimals")}
          </UiText>
        </Pressable>
      </View>

      {scope === "plants" ? (
        <MarketTab hideTitle marketItems={FARMING_PLANT_ITEMS} />
      ) : hasLivestockData ? (
        <MarketTab hideTitle marketItems={FARMING_LIVESTOCK_ITEMS} />
      ) : (
        <ScrollView
          style={styles.animalsScroll}
          contentContainerStyle={styles.animalsScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <AnimalsPlaceholder />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  animalsScroll: { flex: 1 },
  animalsScrollContent: { paddingBottom: 28, flexGrow: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  titleIcon: { marginTop: 2 },
  pageTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: theme.fg,
    lineHeight: myLh(22),
  },
  segments: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accentBorder,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  segmentActive: {
    backgroundColor: theme.accentSoft,
    borderColor: theme.accent,
  },
  segmentPressed: { opacity: 0.9 },
  segmentText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.fgMuted,
    textAlign: "center",
    lineHeight: myLh(15),
  },
  segmentTextActive: {
    color: theme.accent,
  },
  animalsCard: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accentBorder,
  },
  animalsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.fg,
    marginBottom: 10,
    lineHeight: myLh(16),
  },
  animalsBody: {
    fontSize: 15,
    color: theme.fgMuted,
    lineHeight: myLh(15),
  },
});
