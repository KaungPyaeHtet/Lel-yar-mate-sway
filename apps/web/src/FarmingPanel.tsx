import {
  FARMING_LIVESTOCK_ITEMS,
  FARMING_PLANT_ITEMS,
} from "@agriora/core";
import { useState } from "react";
import { IconMarket } from "./icons";
import { useI18n } from "./LocaleContext";
import { MarketPanel } from "./MarketPanel";

type FarmingScope = "plants" | "animals";

function AnimalsPlaceholderPanel() {
  const { t } = useI18n();
  return (
    <div className="card farming-animals-placeholder">
      <p className="result-label">{t("farming.animalsTitle")}</p>
      <p className="hint">{t("farming.animalsBody")}</p>
    </div>
  );
}

/**
 * စိုက်ပျိုးရေး vs မွေးမြူရေး — livestock uses WFP meat/fish/eggs series when present.
 */
export function FarmingPanel() {
  const { t } = useI18n();
  const [scope, setScope] = useState<FarmingScope>("plants");
  const hasLivestockData = FARMING_LIVESTOCK_ITEMS.length > 0;

  return (
    <div className="panel market-panel farming-hub">
      <div className="page-title-row">
        <IconMarket className="panel-icon" aria-hidden />
        <h2 className="page-title">{t("farming.title")}</h2>
      </div>

      <div
        className="farming-segments"
        role="tablist"
        aria-label={t("farming.title")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={scope === "plants"}
          className={
            scope === "plants" ? "farming-segment active" : "farming-segment"
          }
          onClick={() => setScope("plants")}
        >
          {t("farming.segmentPlants")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === "animals"}
          className={
            scope === "animals" ? "farming-segment active" : "farming-segment"
          }
          onClick={() => setScope("animals")}
        >
          {t("farming.segmentAnimals")}
        </button>
      </div>

      {scope === "plants" ? (
        <MarketPanel hideTitle marketItems={FARMING_PLANT_ITEMS} />
      ) : hasLivestockData ? (
        <MarketPanel hideTitle marketItems={FARMING_LIVESTOCK_ITEMS} />
      ) : (
        <AnimalsPlaceholderPanel />
      )}
    </div>
  );
}
