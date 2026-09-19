import { countryById, toLocal } from "./currency";

export type TickDir = "up" | "down" | "flat";

export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume: number;
  rank: number | null;
  tick?: TickDir;
};

export const LIVE_MS = 10_000;

export const CHART_RANGES = [
  { id: "1", label: "1D" },
  { id: "7", label: "7D" },
  { id: "30", label: "1M" },
  { id: "90", label: "3M" },
  { id: "365", label: "1A" },
  { id: "max", label: "Tudo" },
] as const;

export function mergeQuotes(
  coins: MarketCoin[],
  prices: Record<string, { price: number; change24h: number }>,
  silent = false,
): MarketCoin[] {
  return coins.map((c) => {
    const next = prices[c.id];
    if (!next || !Number.isFinite(next.price) || next.price <= 0) return c;
    const tick: TickDir = silent
      ? c.tick ?? "flat"
      : next.price > c.price
        ? "up"
        : next.price < c.price
          ? "down"
          : "flat";
    return { ...c, price: next.price, change24h: next.change24h, tick };
  });
}

export type MarketsPack = {
  coins: MarketCoin[];
  page: number;
  pages: number;
  total: number;
  catalog: number;
};

async function read<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || json?.ok === false) throw new Error(json?.error || "Falha no mercado.");
  return json;
}

export async function fetchMarkets(page = 1, q = ""): Promise<MarketsPack> {
  const params = new URLSearchParams({ page: String(page), per_page: "60" });
  if (q.trim()) params.set("q", q.trim());
  const json = await read<MarketsPack & { ok: boolean }>(`/api/crypto/markets?${params}`);
  return {
    coins: json.coins || [],
    page: json.page || page,
    pages: json.pages || 1,
    total: json.total || 0,
    catalog: json.catalog || 0,
  };
}

export async function fetchChart(id: string, days = "max") {
  const json = await read<{ points: [number, number][] }>(
    `/api/crypto/chart?id=${encodeURIComponent(id)}&days=${encodeURIComponent(days)}`,
  );
  return json.points || [];
}

export async function fetchPrices(ids: string[]) {
  if (!ids.length) return {} as Record<string, { price: number; change24h: number }>;
  const json = await read<{ prices: Record<string, { price: number; change24h: number }> }>(
    `/api/crypto/price?ids=${encodeURIComponent(ids.join(","))}`,
  );
  return json.prices || {};
}

export function formatBRL(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPrice(value: number, countryId = "br", rates: Record<string, number> = { BRL: 1 }) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const country = countryById(countryId);
  const local = toLocal(value, country.currency, rates);
  const zero = country.currency === "JPY" || country.currency === "PYG" || country.currency === "CLP" || country.currency === "COP";
  if (zero || local >= 1000) {
    return local.toLocaleString(country.locale, {
      style: "currency",
      currency: country.currency,
      minimumFractionDigits: zero ? 0 : 2,
      maximumFractionDigits: zero ? 0 : 2,
    });
  }
  if (local >= 1) {
    return local.toLocaleString(country.locale, {
      style: "currency",
      currency: country.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return local.toLocaleString(country.locale, {
    style: "currency",
    currency: country.currency,
    maximumSignificantDigits: 4,
  });
}

export function formatCompact(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatUnits(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1) return value.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
  return value.toLocaleString("pt-BR", { maximumSignificantDigits: 6 });
}
