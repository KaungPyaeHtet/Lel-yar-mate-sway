import { analyzeWithRules } from "@agriora/core";
import { useState } from "react";
import "./App.css";

type Tab = "home" | "news" | "about";

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

  return (
    <div className="app">
      <main className="main">
        {tab === "home" && (
          <div className="hero">
            <h1 className="logo">Agriora</h1>
            <p className="tag">
              Hackathon app — React (Vite) + shared @agriora/core logic.
            </p>
            <span className="pill">Offline-first</span>
          </div>
        )}

        {tab === "news" && (
          <div className="panel">
            <h2 className="page-title">News → price hint</h2>
            <p className="hint">
              Paste macro or crop news. Scoring uses offline rules in
              @agriora/core (not advice).
            </p>
            <textarea
              className="textarea"
              placeholder="Paste a paragraph…"
              rows={8}
              value={paragraph}
              onChange={(e) => setParagraph(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              onClick={() => setResult(analyzeWithRules(paragraph))}
            >
              Estimate trend
            </button>
            {result && result.rows.length > 0 && (
              <div className="card">
                <p className="result-label">Estimate</p>
                <p className={`result-main v-${result.verdict}`}>
                  {verdictLabel(result.verdict)}
                </p>
                <p className="meta">
                  Blend avg {result.avgBlend.toFixed(2)} · keyword net{" "}
                  {result.totalNet.toFixed(2)} · {result.rows.length}{" "}
                  sentence(s)
                </p>
                <ul className="rows">
                  {result.rows.map((r, i) => (
                    <li key={i}>
                      {r.text.length > 100 ? r.text.slice(0, 100) + "…" : r.text}
                      <span className="row-sub">
                        blend {r.blend.toFixed(2)} (rules {r.net.toFixed(2)})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result && result.rows.length === 0 && (
              <p className="hint">Add at least a short sentence.</p>
            )}
          </div>
        )}

        {tab === "about" && (
          <div className="panel">
            <h2 className="page-title">About us</h2>
            <div className="card">
              <p className="body">
                Team Agriora — hackathon build. This web app uses Vite + React;
                the mobile app uses Expo (React Native). Shared price-hint logic
                lives in <code>@agriora/core</code>.
              </p>
            </div>
          </div>
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        {(
          [
            ["home", "Home"],
            ["news", "News"],
            ["about", "About"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "tab active" : "tab"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
