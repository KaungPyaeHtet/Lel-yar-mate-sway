export type PriceObservation = {
  dateIso: string;
  low: number | null;
  high: number | null;
};

export type MarketItem = {
  id: string;
  excelRow: number;
  group: string;
  mainCategory: string;
  category: string;
  itemCategory: string;
  itemDetails: string;
  observations: readonly PriceObservation[];
};
