import { useI18n } from "./LocaleContext";
import {
  Platform,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from "react-native";

const MY_REG = "NotoSansMyanmar_400Regular";
const MY_MED = "NotoSansMyanmar_500Medium";
const MY_SEMI = "NotoSansMyanmar_600SemiBold";
const MY_BOLD = "NotoSansMyanmar_700Bold";

function numericFontWeight(w: TextStyle["fontWeight"]): number {
  if (w == null || w === "normal") return 400;
  if (w === "bold") return 700;
  if (typeof w === "string" && /^\d+$/.test(w)) return parseInt(w, 10);
  if (typeof w === "number" && !Number.isNaN(w)) return w;
  return 400;
}

function pickMyanmarFontFamily(flat: TextStyle | undefined): string {
  const n = numericFontWeight(flat?.fontWeight);
  if (n >= 700) return MY_BOLD;
  if (n >= 600) return MY_SEMI;
  if (n >= 500) return MY_MED;
  return MY_REG;
}

/**
 * Use instead of RN `Text` for app copy. When locale is Myanmar, applies Noto Sans Myanmar
 * (reliable on iOS) and clears letter-spacing / uppercase transforms that break shaping.
 */
export function UiText({ style, ...rest }: TextProps) {
  const { locale } = useI18n();
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;

  if (locale !== "my") {
    return <Text style={style} {...rest} />;
  }

  const family = pickMyanmarFontFamily(flat);
  const patch: TextStyle = {
    fontFamily: family,
    letterSpacing: 0,
    textTransform: "none",
    fontWeight: "normal",
  };

  if (Platform.OS === "ios") {
    const hasVerticalPad =
      flat?.paddingVertical != null ||
      flat?.paddingTop != null ||
      flat?.paddingBottom != null;
    if (!hasVerticalPad) {
      patch.paddingTop = 1;
      patch.paddingBottom = 2;
    }
  }

  return <Text style={[style, patch]} {...rest} />;
}
