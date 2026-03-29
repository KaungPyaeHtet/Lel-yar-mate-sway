/** Rule-based heuristic: macro + crop price direction (not financial advice). */

export type Verdict = "up" | "down" | "flat";

export type SentenceScore = {
  text: string;
  up: number;
  down: number;
  net: number;
  blend: number;
};

type Signal = { w: number; src: string };

const UP_SIGNALS: Signal[] = [
  {
    w: 1.25,
    src:
      "(?:wheat|corn|maize|rice|soybeans?|barley|oats|sugar|cotton|coffee|cocoa|palm\\s+oil|rapeseed|canola)\\s+(?:increas(?:e|es|ed|ing)|rise[sn]?|\\brose\\b|surge[ds]?|jump(?:s|ed|ing)?|spike[ds]?|rall(?:y|ied|ies)|climb(?:s|ed|ing)?|strengthen[ds]?|soar(?:s|ed|ing)?|gain(?:s|ed|ing)?|firm(?:s|ed|ing)?)",
  },
  {
    w: 1.12,
    src:
      "demand\\s+for\\s+(?:wheat|corn|maize|rice|soybeans?)\\s+(?:increas(?:e|es|ed|ing)|rise[sn]?|surge[ds]?|jump\\w*|grow\\w*)",
  },
  {
    w: 1.35,
    src:
      "war|warfare|invasion|airstrike|air\\s+strike|missile\\s+attack|armed\\s+conflict|military\\s+strike|escalat\\w*|troop\\s+buildup",
  },
  {
    w: 1.35,
    src:
      "sanctions?|embargo|blacklist\\w*|export\\s+ban|export\\s+curbs?|export\\s+restrictions?|trade\\s+ban|blockade|seized\\s+vessels?",
  },
  { w: 1.15, src: "tariff\\s+hike|tariffs?\\s+raised|protectionism|import\\s+tariffs?" },
  {
    w: 1.25,
    src:
      "oil\\s+surged|oil\\s+jumped|crude\\s+spike|brent\\s+rall\\w*|wti\\s+rall\\w*|gas\\s+prices\\s+soared|natural\\s+gas\\s+spike|energy\\s+crisis|diesel\\s+costs?",
  },
  {
    w: 1.2,
    src:
      "fertilizer\\s+shortage|fertilizer\\s+prices?|input\\s+costs?\\s+soar|feed\\s+costs?\\s+rise",
  },
  {
    w: 1.2,
    src:
      "red\\s+sea|suez|panama\\s+canal|shipping\\s+disruption|freight\\s+rates?\\s+surge|port\\s+congestion|supply\\s+chain\\s+snarl|vessel\\s+attack|maritime\\s+security",
  },
  {
    w: 1.15,
    src:
      "drought|heatwave|heat\\s+wave|el\\s+niño|la\\s+niña|cyclone|hurricane|typhoon|wildfire|wild\\s+fire|extreme\\s+weather|climate\\s+shock",
  },
  {
    w: 1.1,
    src:
      "crop\\s+loss|harvest\\s+warning|food\\s+insecurity|famine\\s+risk|shortage\\s+of\\s+grain|grain\\s+deal\\s+collapse|export\\s+quota",
  },
  {
    w: 1.05,
    src:
      "inflation\\s+shock|inflation\\s+surge|cpi\\s+hotter|prices\\s+at\\s+record\\s+high|consumer\\s+prices\\s+soar|cost\\s+of\\s+living\\s+crisis",
  },
  {
    w: 0.95,
    src:
      "commodit(?:y|ies)\\s+rall|futures\\s+rall|volatility\\s+spike|safe\\s+haven\\s+demand|geopolitical\\s+risk",
  },
  {
    w: 0.85,
    src:
      "logistics\\s+disruption|border\\s+delay|customs\\s+halt|strike\\s+at\\s+port|union\\s+walkout\\s+at\\s+dock",
  },
];

const DOWN_SIGNALS: Signal[] = [
  {
    w: 1.25,
    src:
      "(?:wheat|corn|maize|rice|soybeans?|barley|oats|sugar|cotton|coffee|cocoa|palm\\s+oil|rapeseed|canola)\\s+(?:decreas(?:e|es|ed|ing)|declin(?:e|es|ed|ing)|drop(?:s|ped|ping)?|fall(?:s|ing|en)?|slide[ds]?|plunge[ds]?|tumble[ds]?|slid|soften[ds]?|ease[ds]?|weaken[ds]?)",
  },
  {
    w: 1.2,
    src:
      "prices?\\s+(?:decreas(?:e|es|ed|ing)|declin(?:e|es|ed|ing)|drop(?:s|ped|ping)?|fall(?:s|ing|en)?|slide[ds]?|plunge[ds]?|tumble[ds]?|slid|soften[ds]?|ease[ds]?)",
  },
  {
    w: 1.08,
    src:
      "demand\\s+for\\s+(?:wheat|corn|maize|rice|soybeans?)\\s+(?:decreas(?:e|es|ed|ing)|declin\\w*|drop\\w*|fall\\w*|weak\\w*)",
  },
  {
    w: 1.3,
    src:
      "ceasefire|peace\\s+deal|peace\\s+talks\\s+advance|truce|de-escalat\\w*|deescalat\\w*|corridor\\s+reopened|exports?\\s+resumed|grain\\s+corridor",
  },
  {
    w: 1.15,
    src:
      "trade\\s+deal\\s+signed|tariff\\s+cut|tariffs?\\s+rolled\\s+back|sanctions?\\s+eased|embargo\\s+lifted",
  },
  {
    w: 1.2,
    src:
      "oversupply|supply\\s+glut|glut\\s+of|surplus\\s+production|warehouses?\\s+full|stockpiles?\\s+swell",
  },
  {
    w: 1.15,
    src:
      "prices?\\s+fell|prices?\\s+plunged|prices?\\s+tumbled|prices?\\s+slid|benchmark\\s+slid|futures\\s+eased|futures\\s+soften\\w*|commodit(?:y|ies)\\s+eased|selloff|bearish\\s+sentiment",
  },
  {
    w: 1.05,
    src:
      "recession\\s+fears|demand\\s+destruction|demand\\s+cooled|demand\\s+weak|slowdown\\s+in\\s+china|economic\\s+contraction",
  },
  {
    w: 1.1,
    src:
      "record\\s+harvest|bumper\\s+crop|output\\s+jumped|production\\s+surge|abundant\\s+supply|strong\\s+supply|import\\s+surge",
  },
  {
    w: 1.05,
    src:
      "strategic\\s+release|reserves?\\s+released|price\\s+cap|subsidy\\s+to\\s+lower|intervention\\s+to\\s+cool\\s+prices",
  },
  {
    w: 0.95,
    src:
      "oil\\s+fell|crude\\s+slid|gas\\s+prices\\s+fell|energy\\s+costs?\\s+eased|inflation\\s+cooled|disinflation",
  },
  {
    w: 0.85,
    src:
      "favorable\\s+weather|rain\\s+relief|improved\\s+outlook\\s+for\\s+crops|yield\\s+recovery",
  },
];

function negatedBefore(text: string, matchIndex: number): boolean {
  const start = Math.max(0, matchIndex - 58);
  const chunk = text.slice(start, matchIndex);
  return /\b(no|not|without|never|unlikely|little|few|hardly|barely)\s+(\S+\s+){0,6}$/i.test(
    chunk
  );
}

function spuriousMatch(text: string, idx: number, len: number): boolean {
  const lo = Math.max(0, idx - 12);
  const hi = Math.min(text.length, idx + len + 12);
  const w = text.slice(lo, hi).toLowerCase();
  if (/\bprice\s+war\b/.test(w)) return true;
  if (/\btrade\s+war\b/.test(w)) return true;
  if (/\bstar\s+war/.test(w)) return true;
  return false;
}

function scoreSide(sentence: string, groups: Signal[], capTotal: number): number {
  let total = 0;
  for (const g of groups) {
    const re = new RegExp(g.src, "gi");
    let hits = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sentence)) !== null) {
      if (negatedBefore(sentence, m.index)) continue;
      if (spuriousMatch(sentence, m.index, m[0].length)) continue;
      total += g.w;
      hits++;
      if (hits >= 2) break;
      if (total >= capTotal) return capTotal;
    }
  }
  return Math.min(capTotal, total);
}

export function splitSentences(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const parts = t.split(/(?<=[.!?])\s+|(?<=\n)\s*/);
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (s.length >= 6) out.push(s);
  }
  if (out.length === 0 && t.length >= 6) out.push(t);
  return out;
}

function scoreSentence(sentence: string): Omit<SentenceScore, "blend"> {
  const cap = 7;
  const up = scoreSide(sentence, UP_SIGNALS, cap);
  const down = scoreSide(sentence, DOWN_SIGNALS, cap);
  return { text: sentence, up, down, net: up - down };
}

function normalizeHeuristic(net: number): number {
  return Math.max(-1, Math.min(1, net / 4));
}

function verdictFromAvg(avgBlend: number, margin = 0.14): Verdict {
  if (avgBlend > margin) return "up";
  if (avgBlend < -margin) return "down";
  return "flat";
}

export function analyzeWithRules(text: string): {
  verdict: Verdict;
  avgBlend: number;
  totalNet: number;
  rows: SentenceScore[];
} {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return { verdict: "flat", avgBlend: 0, totalNet: 0, rows: [] };
  }
  const rows: SentenceScore[] = sentences.map((s) => {
    const r = scoreSentence(s);
    const blend = normalizeHeuristic(r.net);
    return { ...r, blend };
  });
  const totalNet = rows.reduce((a, r) => a + r.net, 0);
  const avgBlend = rows.reduce((a, r) => a + r.blend, 0) / rows.length;
  return {
    verdict: verdictFromAvg(avgBlend),
    avgBlend,
    totalNet,
    rows,
  };
}

/** Blend keyword score with VADER-style compounds (−1…1) per sentence. */
export function analyzeBlended(
  text: string,
  compounds: number[] | null
): {
  verdict: Verdict;
  avgBlend: number;
  totalNet: number;
  rows: SentenceScore[];
  usedVader: boolean;
} {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return {
      verdict: "flat",
      avgBlend: 0,
      totalNet: 0,
      rows: [],
      usedVader: false,
    };
  }
  const hasVader =
    compounds !== null &&
    compounds.length === sentences.length;
  const rows: SentenceScore[] = sentences.map((s, i) => {
    const r = scoreSentence(s);
    const nh = normalizeHeuristic(r.net);
    const c = hasVader ? compounds![i] : null;
    const blend =
      c !== null && c !== undefined ? 0.45 * nh + 0.55 * c : nh;
    return { ...r, blend };
  });
  const totalNet = rows.reduce((a, r) => a + r.net, 0);
  const avgBlend = rows.reduce((a, r) => a + r.blend, 0) / rows.length;
  return {
    verdict: verdictFromAvg(avgBlend),
    avgBlend,
    totalNet,
    rows,
    usedVader: !!hasVader,
  };
}
