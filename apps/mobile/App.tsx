import { analyzeWithRules } from "@agriora/core";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Tab = "home" | "news" | "about";

const bg = "#0c120f";
const fg = "#e6ede8";
const muted = "rgba(230, 237, 232, 0.55)";
const accent = "#5cb87a";
const surface = "#141c17";

function verdictLabel(v: string) {
  if (v === "up") return "Prices may increase";
  if (v === "down") return "Prices may decrease";
  return "Prices may stay about the same";
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [paragraph, setParagraph] = useState("");
  const [result, setResult] = useState<ReturnType<
    typeof analyzeWithRules
  > | null>(null);

  function onEstimate() {
    setResult(analyzeWithRules(paragraph));
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.main}>
        {tab === "home" && (
          <View style={styles.center}>
            <Text style={styles.logo}>Agriora</Text>
            <Text style={styles.tag}>
              Hackathon app — React Native + shared core logic.
            </Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Offline-first</Text>
            </View>
          </View>
        )}

        {tab === "news" && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.pageTitle}>News → price hint</Text>
            <Text style={styles.hint}>
              Paste macro or crop news. Scoring uses offline rules in
              @agriora/core (not advice).
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Paste a paragraph…"
              placeholderTextColor="rgba(230,237,232,0.35)"
              multiline
              value={paragraph}
              onChangeText={setParagraph}
            />
            <Pressable style={styles.btn} onPress={onEstimate}>
              <Text style={styles.btnText}>Estimate trend</Text>
            </Pressable>
            {result && result.rows.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.resultLabel}>Estimate</Text>
                <Text
                  style={[
                    styles.resultMain,
                    result.verdict === "up" && styles.up,
                    result.verdict === "down" && styles.down,
                  ]}
                >
                  {verdictLabel(result.verdict)}
                </Text>
                <Text style={styles.meta}>
                  Blend avg {result.avgBlend.toFixed(2)} · keyword net{" "}
                  {result.totalNet.toFixed(2)} · {result.rows.length}{" "}
                  sentence(s)
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
              <Text style={styles.hint}>Add at least a short sentence.</Text>
            )}
          </ScrollView>
        )}

        {tab === "about" && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.pageTitle}>About us</Text>
            <View style={styles.card}>
              <Text style={styles.body}>
                Team Agriora — hackathon build. Mobile uses React Native
                (Expo); web uses Vite + React. Shared price-hint logic lives in
                the @agriora/core package.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      <View style={styles.tabbar}>
        {(
          [
            ["home", "Home"],
            ["news", "News"],
            ["about", "About"],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            style={styles.tab}
            onPress={() => setTab(id)}
          >
            <Text
              style={[styles.tabText, tab === id && styles.tabTextActive]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg },
  main: { flex: 1, paddingTop: 52 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  logo: {
    fontSize: 42,
    fontWeight: "700",
    color: accent,
    letterSpacing: -1,
  },
  tag: { marginTop: 12, color: muted, textAlign: "center", lineHeight: 22 },
  pill: {
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(92, 184, 122, 0.15)",
  },
  pillText: {
    color: accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: fg,
    marginBottom: 8,
  },
  hint: { color: muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  input: {
    backgroundColor: surface,
    borderRadius: 12,
    padding: 12,
    color: fg,
    minHeight: 140,
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
  body: { color: muted, fontSize: 15, lineHeight: 22 },
  tabbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: "rgba(12, 18, 15, 0.96)",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 6 },
  tabText: { color: muted, fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: accent },
});
