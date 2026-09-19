import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

const CG = "https://api.coingecko.com/api/v3";
const LIST_TTL = 6 * 60 * 60 * 1000;
const MARKETS_TTL = 45_000;
const SEARCH_TTL = 60_000;
const CHART_TTL = 8_000;
const PRICE_TTL = 4_000;

export type CoinRow = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume: number;
  rank: number | null;
};

type CatalogCoin = { id: string; symbol: string; name: string };

const FALLBACK: CoinRow[] = [
  ["bitcoin", "btc", "Bitcoin", 450000],
  ["ethereum", "eth", "Ethereum", 14500],
  ["solana", "sol", "Solana", 620],
  ["ripple", "xrp", "XRP", 7.8],
  ["binancecoin", "bnb", "BNB", 4200],
  ["dogecoin", "doge", "Dogecoin", 0.48],
  ["cardano", "ada", "Cardano", 1.25],
  ["avalanche-2", "avax", "Avalanche", 54],
  ["chainlink", "link", "Chainlink", 68],
  ["polkadot", "dot", "Polkadot", 6.2],
  ["litecoin", "ltc", "Litecoin", 320],
  ["near", "near", "NEAR Protocol", 20],
  ["uniswap", "uni", "Uniswap", 48],
  ["pepe", "pepe", "Pepe", 0.000023],
  ["sui", "sui", "Sui", 7.4],
].map(([id, symbol, name, price], i) => ({
  id: String(id),
  symbol: String(symbol),
  name: String(name),
  image: "",
  price: Number(price),
  change24h: +(((hash(`${id}-c`) - 0.5) * 8)).toFixed(2),
  marketCap: Number(price) * (80_000_000 - i * 2_000_000),
  volume: Number(price) * (4_000_000 - i * 80_000),
  rank: i + 1,
}));

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 2 ** 32;
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

async function cg<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(`${CG}${path}`, {
      headers: { Accept: "application/json", "User-Agent": "criptofy/1.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

let catalog: { at: number; coins: CatalogCoin[] } | null = null;
const marketsMemo = new Map<string, { at: number; coins: CoinRow[]; pages: number }>();
const searchMemo = new Map<string, { at: number; coins: CoinRow[] }>();
const chartMemo = new Map<string, { at: number; points: [number, number][] }>();
const priceMemo = new Map<string, { at: number; price: number; change24h: number }>();

async function loadCatalog() {
  if (catalog && Date.now() - catalog.at < LIST_TTL) return catalog.coins;
  try {
    const coins = await cg<CatalogCoin[]>("/coins/list?include_platform=false");
    if (Array.isArray(coins) && coins.length > 100) {
      catalog = {
        at: Date.now(),
        coins: coins
          .filter((c) => c?.id && c.symbol && c.name)
          .map((c) => ({ id: String(c.id), symbol: String(c.symbol).toLowerCase(), name: String(c.name) })),
      };
      return catalog.coins;
    }
  } catch {
    /* fallback */
  }
  return catalog?.coins ?? FALLBACK.map((c) => ({ id: c.id, symbol: c.symbol, name: c.name }));
}

function mapMarket(raw: Record<string, unknown>, i: number): CoinRow {
  return {
    id: String(raw.id || ""),
    symbol: String(raw.symbol || "").toLowerCase(),
    name: String(raw.name || ""),
    image: String(raw.image || ""),
    price: Number(raw.current_price) || 0,
    change24h: Number(raw.price_change_percentage_24h) || 0,
    marketCap: Number(raw.market_cap) || 0,
    volume: Number(raw.total_volume) || 0,
    rank: Number(raw.market_cap_rank) || i + 1,
  };
}

function fallbackCoin(id: string): CoinRow {
  return (
    FALLBACK.find((c) => c.id === id) || {
      id,
      symbol: id.slice(0, 5),
      name: id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      image: "",
      price: +(1 + hash(id) * 80).toFixed(4),
      change24h: +((hash(id) - 0.5) * 6).toFixed(2),
      marketCap: 0,
      volume: 0,
      rank: null,
    }
  );
}

async function fetchMarketsPage(page: number, perPage: number) {
  const key = `${page}:${perPage}`;
  const hit = marketsMemo.get(key);
  if (hit && Date.now() - hit.at < MARKETS_TTL) return hit;
  try {
    const rows = await cg<Record<string, unknown>[]>(
      `/coins/markets?vs_currency=brl&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`,
    );
    const coins = (rows || []).map(mapMarket).filter((c) => c.id);
    void loadCatalog();
    const total = catalog?.coins.length || 16_000;
    const pack = { at: Date.now(), coins, pages: Math.max(1, Math.ceil(total / perPage)) };
    marketsMemo.set(key, pack);
    coins.forEach((c) => priceMemo.set(c.id, { at: Date.now(), price: c.price, change24h: c.change24h }));
    return pack;
  } catch {
    const start = (page - 1) * perPage;
    return { coins: FALLBACK.slice(start, start + perPage), pages: 1 };
  }
}

async function fetchByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 80);
  if (!unique.length) return [];
  try {
    const rows = await cg<Record<string, unknown>[]>(
      `/coins/markets?vs_currency=brl&ids=${encodeURIComponent(unique.join(","))}&per_page=250&page=1&sparkline=false&price_change_percentage=24h`,
    );
    const mapped = (rows || []).map(mapMarket).filter((c) => c.id);
    mapped.forEach((c) => priceMemo.set(c.id, { at: Date.now(), price: c.price, change24h: c.change24h }));
    const found = new Map(mapped.map((c) => [c.id, c]));
    return unique.map((id) => found.get(id) || fallbackCoin(id));
  } catch {
    return unique.map(fallbackCoin);
  }
}

function scoreMatch(coin: CatalogCoin, q: string) {
  const id = coin.id.toLowerCase();
  const symbol = coin.symbol.toLowerCase();
  const name = coin.name.toLowerCase();
  if (id === q) return 120;
  if (name === q) return 110;
  if (symbol === q) return 100;
  if (symbol.startsWith(q) || name.startsWith(q)) return 70;
  if (id.includes(q) || symbol.includes(q) || name.includes(q)) return 40;
  return 0;
}

async function searchCoins(q: string) {
  const key = q.toLowerCase().trim();
  const hit = searchMemo.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.coins;
  const all = await loadCatalog();
  const ranked = all
    .map((c) => ({ c, s: scoreMatch(c, key) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 80)
    .map((x) => x.c);
  const priced = await fetchByIds(ranked.map((c) => c.id));
  const byId = new Map(priced.map((c) => [c.id, c]));
  const coins = ranked.map((c) => byId.get(c.id) || { ...fallbackCoin(c.id), name: c.name, symbol: c.symbol });
  searchMemo.set(key, { at: Date.now(), coins });
  return coins;
}

function chartDays(raw: string) {
  const allowed = new Set(["1", "7", "30", "90", "365", "max"]);
  return allowed.has(raw) ? raw : "max";
}

async function fetchChart(id: string, days: string) {
  const key = `${id}:${days}`;
  const hit = chartMemo.get(key);
  if (hit && Date.now() - hit.at < CHART_TTL) return hit.points;
  try {
    const json = await cg<{ prices?: [number, number][] }>(
      `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=brl&days=${days}`,
    );
    const points = (json.prices || []).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (points.length > 8) {
      chartMemo.set(key, { at: Date.now(), points });
      return points;
    }
  } catch {
    /* synth */
  }
  const price = priceMemo.get(id)?.price || fallbackCoin(id).price;
  const now = Date.now();
  const span = days === "max" ? 5 * 365 : Number(days) || 365;
  const steps = Math.min(180, Math.max(60, span * 2));
  const points: [number, number][] = [];
  let p = price;
  for (let i = steps; i >= 0; i--) {
    p = Math.max(p * (1 + (hash(`${id}-${days}-${i}`) - 0.5) * 0.012), price * 0.35);
    points.push([now - i * (span * 86400000) / steps, +p.toFixed(8)]);
  }
  chartMemo.set(key, { at: Date.now(), points });
  return points;
}

async function fetchPrices(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 80);
  const now = Date.now();
  const missing = unique.filter((id) => {
    const hit = priceMemo.get(id);
    return !hit || now - hit.at > PRICE_TTL;
  });
  if (missing.length) {
    try {
      const json = await cg<Record<string, { brl?: number; brl_24h_change?: number }>>(
        `/simple/price?ids=${encodeURIComponent(missing.join(","))}&vs_currencies=brl&include_24hr_change=true`,
      );
      for (const id of missing) {
        const row = json[id];
        if (row && Number.isFinite(row.brl)) {
          priceMemo.set(id, { at: now, price: Number(row.brl), change24h: Number(row.brl_24h_change) || 0 });
        }
      }
    } catch {
      /* keep */
    }
  }
  const out: Record<string, { price: number; change24h: number }> = {};
  for (const id of unique) {
    const hit = priceMemo.get(id);
    if (hit) out[id] = { price: hit.price, change24h: hit.change24h };
  }
  return out;
}

export async function handleCrypto(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const raw = req.url || "";
  const path = raw.split("?")[0];
  if (!path.startsWith("/api/crypto")) return false;
  if (req.method !== "GET") {
    send(res, 405, { ok: false, error: "Use GET." });
    return true;
  }
  const q = new URL(raw, "http://local");
  try {
    if (path === "/api/crypto/markets") {
      const query = (q.searchParams.get("q") || "").trim();
      const page = Math.max(1, Number(q.searchParams.get("page") || 1) || 1);
      const perPage = Math.min(100, Math.max(20, Number(q.searchParams.get("per_page") || 60) || 60));
      const all = await loadCatalog();
      if (query) {
        const coins = await searchCoins(query);
        send(res, 200, { ok: true, coins, page: 1, pages: 1, total: coins.length, catalog: all.length });
        return true;
      }
      const pack = await fetchMarketsPage(page, perPage);
      send(res, 200, { ok: true, coins: pack.coins, page, pages: pack.pages, total: all.length, catalog: all.length });
      return true;
    }
    if (path === "/api/crypto/chart") {
      const id = (q.searchParams.get("id") || "").trim();
      if (!id) {
        send(res, 400, { ok: false, error: "Informe a moeda." });
        return true;
      }
      send(res, 200, { ok: true, id, points: await fetchChart(id, chartDays(q.searchParams.get("days") || "max")) });
      return true;
    }
    if (path === "/api/crypto/price") {
      const ids = (q.searchParams.get("ids") || "").split(",").map((x) => x.trim()).filter(Boolean);
      send(res, 200, { ok: true, prices: await fetchPrices(ids) });
      return true;
    }
    send(res, 404, { ok: false, error: "Rota não encontrada." });
  } catch (err) {
    send(res, 502, { ok: false, error: err instanceof Error ? err.message : "Falha no mercado." });
  }
  return true;
}

function attach(server: ViteDevServer) {
  server.middlewares.use(async (req, res, next) => {
    if (await handleCrypto(req, res)) return;
    next();
  });
}

export function cryptoPlugin(): Plugin {
  return { name: "criptofy-crypto", configureServer: attach, configurePreviewServer: attach };
}
