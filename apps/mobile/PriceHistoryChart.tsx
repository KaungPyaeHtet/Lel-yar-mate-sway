import type { AppLocale } from "@agriora/core";
import { useWindowDimensions, View, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { theme } from "./theme";
import { UiText } from "./UiText";

type Point = { dateIso: string; mid: number };

function formatAxisDate(dateIso: string, locale: AppLocale): string {
  try {
    const d = new Date(dateIso + "T12:00:00");
    return new Intl.DateTimeFormat(locale === "my" ? "my-MM" : "en-GB", {
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return dateIso.slice(5);
  }
}

const VB_W = 320;
const VB_H = 140;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 28;
const INNER_W = VB_W - PAD_L - PAD_R;
const INNER_H = VB_H - PAD_T - PAD_B;

/** Same line + area chart as web `PriceHistoryChart`, for React Native. */
export function PriceHistoryChartMobile({
  series,
  locale,
}: {
  series: Point[];
  locale: AppLocale;
}) {
  const { width: winW } = useWindowDimensions();
  const svgW = Math.min(560, Math.max(280, winW - 48));
  const svgH = Math.round((svgW * VB_H) / VB_W);

  if (series.length < 2) {
    return (
      <UiText style={styles.chartEmpty}>
        {locale === "my"
          ? "ပြသရန် ဈေးမှတ်တမ်း မလုံလောက်ပါ။"
          : "Not enough price history to draw a chart."}
      </UiText>
    );
  }

  const mids = series.map((p) => p.mid);
  const minV = Math.min(...mids);
  const maxV = Math.max(...mids);
  const span = maxV - minV || 1;

  const xAt = (i: number) =>
    PAD_L + (INNER_W * i) / Math.max(1, series.length - 1);
  const yAt = (v: number) =>
    PAD_T + INNER_H - ((v - minV) / span) * INNER_H;

  const pathD = series
    .map((p, i) =>
      `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.mid).toFixed(1)}`
    )
    .join(" ");

  const borderStroke = "rgba(27, 35, 25, 0.12)";
  const accent = theme.accent;

  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Price history">
      <Svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <LinearGradient id="riceLineGradM" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor="rgba(27, 107, 54, 0.2)"
              stopOpacity={1}
            />
            <Stop
              offset="1"
              stopColor="rgba(27, 107, 54, 0.03)"
              stopOpacity={1}
            />
          </LinearGradient>
        </Defs>
        {[0, 0.5, 1].map((t) => {
          const y = PAD_T + INNER_H * (1 - t);
          return (
            <Line
              key={t}
              x1={PAD_L}
              y1={y}
              x2={VB_W - PAD_R}
              y2={y}
              stroke={borderStroke}
              strokeWidth={1}
            />
          );
        })}
        <Path
          d={`${pathD} L ${xAt(series.length - 1)} ${PAD_T + INNER_H} L ${PAD_L} ${PAD_T + INNER_H} Z`}
          fill="url(#riceLineGradM)"
        />
        <Path
          d={pathD}
          fill="none"
          stroke={accent}
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.map((p, i) => (
          <Circle
            key={p.dateIso}
            cx={xAt(i)}
            cy={yAt(p.mid)}
            r={4}
            fill={theme.surface}
            stroke={accent}
            strokeWidth={2.25}
          />
        ))}
        <SvgText
          x={2}
          y={yAt(maxV) + 3}
          fill={theme.fgMuted}
          fontSize={11}
          fontWeight="600"
        >
          {`${Math.round(maxV / 1000)}k`}
        </SvgText>
        <SvgText
          x={2}
          y={yAt(minV) + 12}
          fill={theme.fgMuted}
          fontSize={11}
          fontWeight="600"
        >
          {`${Math.round(minV / 1000)}k`}
        </SvgText>
      </Svg>
      <View style={styles.xLabels}>
        {series.map((p) => (
          <UiText key={p.dateIso} style={styles.xLabel} numberOfLines={1}>
            {formatAxisDate(p.dateIso, locale)}
          </UiText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 8,
    width: "100%",
  },
  chartEmpty: {
    fontSize: 14,
    color: theme.fgMuted,
    marginBottom: 8,
  },
  xLabels: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  xLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: theme.fgMuted,
    textAlign: "center",
  },
});
