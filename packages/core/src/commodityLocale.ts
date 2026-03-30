import type { AppLocale } from "./appLocale";
import { shortMarketItemLabelForUi } from "./market";
import type { MarketItem } from "./marketTypes";

/** English `itemCategory` values from WFP-style food CSV → မြန်မာ အမည် */
const WFP_COMMODITY_MY: Record<string, string> = {
  Garlic: "ကြက်သွန်ဖြူ",
  Onions: "ကြက်သွန်နီ",
  "Onions (local)": "ကြက်သွန်နီ (ဒေသခံ)",
  Tomatoes: "ခရမ်းချဉ်",
  "Tomatoes (local)": "ခရမ်းချဉ် (ဒေသခံ)",
  "Eggs (local)": "ကြက်ဥ (ဒေသခံ)",
  "Meat (beef)": "အမဲသား",
  "Meat (chicken)": "ကြက်သား",
  "Meat (pork)": "ဝက်သား",
};

const CATEGORY_MY: Record<string, string> = {
  "vegetables and fruits": "ဟင်းသီးဟင်းရွက် နှင့် သစ်သီး",
  "meat, fish and eggs": "အသား၊ ငါး၊ ကြက်ဥ",
};

export function marketItemLabelForLocale(
  item: MarketItem,
  locale: AppLocale,
  maxChars = 120
): string {
  if (locale === "en") {
    return shortMarketItemLabelForUi(item, maxChars);
  }
  const myName = WFP_COMMODITY_MY[item.itemCategory];
  if (myName) {
    const sep = item.itemDetails.indexOf("·");
    const tail =
      sep >= 0
        ? item.itemDetails.slice(sep)
        : " · နိုင်ငံတွင်း အလယ်ကျ ဈေး (WFP)";
    const s = `${myName.trim()}${tail}`.trim();
    if (s.length <= maxChars) return s;
    return `${s.slice(0, Math.max(0, maxChars - 1))}…`;
  }
  return shortMarketItemLabelForUi(item, maxChars);
}

/** Compact label for picker rows (primary line). */
export function marketItemPrimaryForLocale(
  item: MarketItem,
  locale: AppLocale
): string {
  if (locale === "my" && WFP_COMMODITY_MY[item.itemCategory]) {
    return WFP_COMMODITY_MY[item.itemCategory]!;
  }
  return item.itemCategory;
}

/** Compact label for picker rows (secondary line). */
export function marketItemSecondaryForLocale(
  item: MarketItem,
  locale: AppLocale
): string {
  if (locale === "my") {
    return CATEGORY_MY[item.category] ?? item.category;
  }
  return item.category;
}

/** One line under selection: group · optional translated category context. */
export function marketItemMetaLineForLocale(
  item: MarketItem,
  locale: AppLocale
): string {
  const cat =
    locale === "my" ? CATEGORY_MY[item.category] ?? item.category : item.category;
  return [item.group, cat].filter(Boolean).join(" · ");
}

/** Include English + မြန်မာ names so search matches in either language. */
export function marketItemSearchBlob(
  item: MarketItem,
  locale: AppLocale
): string {
  const parts = [
    item.group,
    item.mainCategory,
    item.category,
    item.itemCategory,
    item.itemDetails,
  ];
  if (locale === "my") {
    const my = WFP_COMMODITY_MY[item.itemCategory];
    const cat = CATEGORY_MY[item.category];
    if (my) parts.push(my);
    if (cat) parts.push(cat);
  }
  return parts.filter(Boolean).join(" ");
}
