import type { AppLocale } from "@agriora/core";

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

export function PriceHistoryChart({
  series,
  locale,
}: {
  series: Point[];
  locale: AppLocale;
}) {
  if (series.length < 2) {
    return (
      <p className="chart-empty">
        {locale === "my"
          ? "ပြသရန် ဈေးမှတ်တမ်း မလုံလောက်ပါ။"
          : "Not enough price history to draw a chart."}
      </p>
    );
  }

  const w = 320;
  const h = 140;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const mids = series.map((p) => p.mid);
  const minV = Math.min(...mids);
  const maxV = Math.max(...mids);
  const span = maxV - minV || 1;

  const xAt = (i: number) =>
    padL + (innerW * i) / Math.max(1, series.length - 1);
  const yAt = (v: number) =>
    padT + innerH - ((v - minV) / span) * innerH;

  const pathD = series
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.mid).toFixed(1)}`)
    .join(" ");

  return (
    <div className="price-chart-wrap" role="img" aria-label="Price history">
      <svg
        className="price-chart-svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="riceLineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(148, 232, 176, 0.5)" />
            <stop offset="100%" stopColor="rgba(148, 232, 176, 0.04)" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = padT + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padL}
              y1={y}
              x2={w - padR}
              y2={y}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={1}
            />
          );
        })}
        <path
          d={`${pathD} L ${xAt(series.length - 1)} ${padT + innerH} L ${padL} ${padT + innerH} Z`}
          fill="url(#riceLineGrad)"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#a8f0c0"
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.map((p, i) => (
          <circle
            key={p.dateIso}
            cx={xAt(i)}
            cy={yAt(p.mid)}
            r={4}
            fill="#1a2820"
            stroke="#c8f5d8"
            strokeWidth={2.25}
          />
        ))}
        <text
          x={2}
          y={yAt(maxV) + 3}
          fill="#e8f4ec"
          fontSize="11"
          fontWeight="600"
        >
          {Math.round(maxV / 1000)}k
        </text>
        <text
          x={2}
          y={yAt(minV) + 12}
          fill="#e8f4ec"
          fontSize="11"
          fontWeight="600"
        >
          {Math.round(minV / 1000)}k
        </text>
      </svg>
      <div className="price-chart-xlabels">
        {series.map((p) => (
          <span key={p.dateIso} className="price-chart-xlabel">
            {formatAxisDate(p.dateIso, locale)}
          </span>
        ))}
      </div>
    </div>
  );
}
