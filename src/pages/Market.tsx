import { useEffect, useState } from "react";
import { CoinIcon } from "../components/CoinIcon";
import { fetchMarkets, fetchPrices, formatCompact, LIVE_MS, mergeQuotes, type MarketCoin } from "../lib/crypto";
import { useStore } from "../store";

export function Market() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [catalog, setCatalog] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 320);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    void fetchMarkets(1, debounced)
      .then((pack) => {
        if (stop) return;
        setCoins(pack.coins);
        setPage(pack.page);
        setPages(pack.pages);
        setCatalog(pack.catalog);
      })
      .finally(() => {
        if (!stop) setLoading(false);
      });
    return () => {
      stop = true;
    };
  }, [debounced]);

  const ids = coins.map((c) => c.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let first = true;
    const tick = async () => {
      const prices = await fetchPrices(ids.split(",").slice(0, 80));
      setCoins((cur) => mergeQuotes(cur, prices, first));
      first = false;
    };
    void tick();
    const timer = window.setInterval(() => void tick(), LIVE_MS);
    return () => window.clearInterval(timer);
  }, [ids]);

  const loadMore = async () => {
    if (more || page >= pages || debounced) return;
    setMore(true);
    try {
      const pack = await fetchMarkets(page + 1);
      setCoins((cur) => {
        const seen = new Set(cur.map((c) => c.id));
        return [...cur, ...pack.coins.filter((c) => !seen.has(c.id))];
      });
      setPage(pack.page);
      setPages(pack.pages);
    } finally {
      setMore(false);
    }
  };

  return (
    <section className="wrap">
      <div className="page-head">
        <h1>Mercado</h1>
        <p className="muted">
          {catalog ? `${catalog.toLocaleString("pt-BR")} criptomoedas` : "Carregando o livro"} · preços em reais
        </p>
      </div>
      <label className="search">
        <span>Buscar</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Bitcoin, ETH, Solana, PEPE…" />
      </label>
      <div className="table">
        <div className="table-head">
          <span>Moeda</span>
          <span>Preço</span>
          <span>24h</span>
          <span className="hide-sm">Cap</span>
        </div>
        {loading && !coins.length ? <p className="muted">Abrindo o mercado…</p> : null}
        {coins.map((c) => (
          <button key={c.id} className={`table-row ${c.tick === "up" ? "tick-up" : c.tick === "down" ? "tick-down" : ""}`} onClick={() => s.openAsset(c.id)}>
            <span className="row-coin">
              <CoinIcon image={c.image} symbol={c.symbol} name={c.name} size={28} />
              <span>
                <strong>{c.symbol.toUpperCase()}</strong>
                <small>{c.name}</small>
              </span>
            </span>
            <b className={c.tick === "up" ? "up" : c.tick === "down" ? "down" : ""}>
              {c.tick === "up" ? "▲ " : c.tick === "down" ? "▼ " : ""}
              {s.price(c.price)}
            </b>
            <em className={(c.change24h || 0) >= 0 ? "up" : "down"}>
              {(c.change24h || 0) >= 0 ? "+" : ""}
              {(c.change24h || 0).toFixed(2)}%
            </em>
            <span className="hide-sm muted">{formatCompact(c.marketCap)}</span>
          </button>
        ))}
      </div>
      {!debounced && page < pages ? (
        <button className="btn btn-ghost" style={{ width: "100%", margin: "16px 0 24px" }} onClick={() => void loadMore()} disabled={more}>
          {more ? "Carregando…" : "Ver mais moedas"}
        </button>
      ) : null}
    </section>
  );
}
