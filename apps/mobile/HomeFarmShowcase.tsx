import type { AppStringKey } from "@agriora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Dimensions,
  FlatList,
  Image,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useI18n } from "./LocaleContext";
import { theme } from "./theme";

const SOURCES: ImageSourcePropType[] = [
  require("./assets/farm/01-rice-planting.jpg"),
  require("./assets/farm/02-paddy-plains.jpg"),
  require("./assets/farm/03-tea-harvest.jpg"),
  require("./assets/farm/04-inle-lake-myanmar.jpg"),
];

const SLIDE_KEYS: AppStringKey[] = [
  "home.farmSlide1",
  "home.farmSlide2",
  "home.farmSlide3",
  "home.farmSlide4",
];

const ROTATE_MS = 6000;
/** viewport height = width * (10/16) for 16:10 */
const HEIGHT_RATIO = 10 / 16;
const H_PAD = 48;
const MAX_W = 340;

function slideWidth(screenW: number) {
  return Math.min(screenW - H_PAD, MAX_W);
}

export function HomeFarmShowcase() {
  const { t, tf } = useI18n();
  const [idx, setIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [w, setW] = useState(() => slideWidth(Dimensions.get("window").width));
  const listRef = useRef<FlatList>(null);
  const idxRef = useRef(0);
  idxRef.current = idx;

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => {
      setW(slideWidth(window.width));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => sub?.remove?.();
  }, []);

  const h = w * HEIGHT_RATIO;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / w);
      if (i >= 0 && i < SOURCES.length) setIdx(i);
    },
    [w]
  );

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      const next = (idxRef.current + 1) % SOURCES.length;
      listRef.current?.scrollToOffset({
        offset: next * w,
        animated: true,
      });
      setIdx(next);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion, w]);

  const go = useCallback(
    (i: number) => {
      listRef.current?.scrollToOffset({ offset: i * w, animated: true });
      setIdx(i);
    },
    [w]
  );

  useEffect(() => {
    listRef.current?.scrollToOffset({
      offset: idxRef.current * w,
      animated: false,
    });
  }, [w]);

  const renderItem = useCallback(
    ({ item, index }: { item: ImageSourcePropType; index: number }) => (
      <View style={{ width: w, height: h }}>
        <Image
          source={item}
          style={styles.slideImg}
          resizeMode="cover"
          accessibilityLabel={t(SLIDE_KEYS[index])}
        />
        <View style={styles.captionWrap} pointerEvents="none">
          <Text style={styles.caption}>{t(SLIDE_KEYS[index])}</Text>
        </View>
      </View>
    ),
    [h, w, t]
  );

  return (
    <View
      style={styles.wrap}
      accessibilityRole="none"
      accessibilityLabel={t("home.farmShowcaseAria")}
    >
      <View
        style={[
          styles.carouselShell,
          { width: w, height: h },
        ]}
      >
      <FlatList
        ref={listRef}
        data={SOURCES}
        keyExtractor={(_, i) => `farm-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        style={{ width: w, height: h }}
        onMomentumScrollEnd={onScroll}
        getItemLayout={(_, index) => ({
          length: w,
          offset: w * index,
          index,
        })}
        renderItem={renderItem}
        extraData={w}
      />
      </View>
      <View
        style={styles.dots}
        accessibilityRole="none"
        accessibilityLabel={t("home.farmControlsAria")}
      >
        {SOURCES.map((_, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={tf("home.farmPickPhoto", { n: i + 1 })}
            hitSlop={10}
            onPress={() => go(i)}
            style={({ pressed }) => [
              styles.dotHit,
              pressed && styles.dotPressed,
            ]}
          >
            <View
              style={[styles.dot, i === idx && styles.dotActive]}
            />
          </Pressable>
        ))}
      </View>
      <Text style={styles.credits}>{t("home.farmCredits")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: MAX_W,
    alignSelf: "center",
    marginBottom: 18,
  },
  carouselShell: {
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  slideImg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  captionWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingTop: 28,
    paddingBottom: 10,
    backgroundColor: "rgba(15, 22, 18, 0.78)",
  },
  caption: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  dotHit: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "rgba(61, 82, 64, 0.38)",
  },
  dotActive: {
    backgroundColor: theme.accent,
    transform: [{ scale: 1.2 }],
  },
  dotPressed: {
    opacity: 0.85,
  },
  credits: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 14,
    color: theme.fgMuted,
    textAlign: "center",
    paddingHorizontal: 4,
  },
});
