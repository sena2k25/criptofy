import { useEffect, useState } from "react";
import { CoinIcon } from "../components/CoinIcon";
import { PriceChart } from "../components/PriceChart";
import { fetchChart, fetchMarkets, fetchPrices, formatCompact, formatUnits, LIVE_MS, type MarketCoin } from "../lib/crypto";
import { MIN_INVEST, useStore } from "../store";

export function Asset() {
  const s = useStore();
  const [coin, setCoin] = useState<MarketCoin | null>(null);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [days, setDays] = useState("max");
  const [amount, setAmount] = useState("100");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const hold = s.holdings.find((h) => h.id === s.assetId);

  useEffect(() => {
    let stop = false;
    void fetchMarkets(1, s.assetId).then((pack) => {
      const found = pack.coins.find((c) => c.id === s.assetId) || pack.coins[0];
      if (!stop && found) setCoin(found);
    });
    return () => {
      stop = true;
    };
  }, [s.assetId]);

  useEffect(() => {
    let stop = false;
    setPoints([]);
    void fetchChart(s.assetId, days).then((next) => {
      if (!stop) setPoints(next);
    });
    return () => {
      stop = true;
    };
  }, [s.assetId, days]);

  useEffect(() => {
    if (!s.assetId) return;
    const tick = async () => {
      const prices = await fetchPrices([s.assetId]);
      const p = prices[s.assetId];
      if (!p) return;
      setCoin((cur) => {
        if (!cur) return cur;
        const dir = p.price > cur.price ? "up" : p.price < cur.price ? "down" : "flat";
        return { ...cur, price: p.price, change24h: p.change24h, tick: dir };
      });
      setPoints((cur) => {
        if (cur.length < 2) return cur;
        const next: [number, number] = [Date.now(), p.price];
        const last = cur[cur.length - 1];
        if (last && Math.abs(last[1] - p.price) < 1e-12) return cur;
        return [...cur.slice(-1200), next];
      });
    };
    void tick();
    const timer = window.setInterval(() => void tick(), LIVE_MS);
    return () => window.clearInterval(timer);
  }, [s.assetId]);

  const value = Number(amount.replace(",", ".")) || 0;
  const units = coin && coin.price > 0 ? value / coin.price : 0;
  const holdValue = hold && coin ? hold.units * coin.price : 0;
  const pnl = hold && coin ? holdValue - hold.invested : 0;

  const submit = () => {
    if (!coin) return;
    if (side === "buy") s.buy(coin, value);
    else s.sell(coin.id, value, coin.price);
  };

  if (!coin) {
    return (
      <section className="wrap">
        <p className="muted">Abrindo o ativo…</p>
      </section>
    );
  }

  return (
    <section className="wrap asset">
      <button className="back" onClick={() => s.setPage("market")}>
        ← Mercado
      </button>
      <div className="asset-head">
        <div className="asset-title">
          <CoinIcon image={coin.image} symbol={coin.symbol} name={coin.name} size={44} />
          <div>
            <h1>
              {coin.name} <span>{coin.symbol.toUpperCase()}</span>
            </h1>
            <p className="muted">
              Cap {formatCompact(coin.marketCap)} · Vol 24h {formatCompact(coin.volume)}
            </p>
          </div>
        </div>
        <div className={`last ${(coin.change24h || 0) >= 0 ? "up" : "down"} ${coin.tick === "up" ? "tick-up" : coin.tick === "down" ? "tick-down" : ""}`}>
          <b>
            {s.price(coin.price)}
            {coin.tick === "up" ? " ▲" : coin.tick === "down" ? " ▼" : ""}
          </b>
          <em>
            {(coin.change24h || 0) >= 0 ? "+" : ""}
            {(coin.change24h || 0).toFixed(2)}% 24h
          </em>
        </div>
      </div>
      <PriceChart points={points} days={days} onDays={setDays} />
      {hold ? (
        <p className="tiny hold-line">
          Você tem {formatUnits(hold.units)} {coin.symbol.toUpperCase()} · valor {s.money(holdValue)} ·{" "}
          <em className={pnl >= 0 ? "up" : "down"}>
            {pnl >= 0 ? "+" : ""}
            {s.money(pnl)}
          </em>
        </p>
      ) : null}
      <div className="invest-box">
        <div className="sides">
          <button className={side === "buy" ? "on" : ""} onClick={() => setSide("buy")}>
            Comprar
          </button>
          <button className={side === "sell" ? "on" : ""} onClick={() => setSide("sell")}>
            Vender
          </button>
        </div>
        <label className="field">
          <span>Valor em reais {side === "buy" ? `(mín. ${s.money(MIN_INVEST)})` : ""}</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="picks">
          {(side === "buy" ? ["50", "100", "250", "500"] : ["25", "50", "100"]).map((v) => (
            <button key={v} type="button" className={amount === v ? "on" : ""} onClick={() => setAmount(v)}>
              R$ {v}
            </button>
          ))}
          {side === "sell" && holdValue > 0 ? (
            <button type="button" onClick={() => setAmount(holdValue.toFixed(2))}>
              Tudo
            </button>
          ) : null}
        </div>
        <p className="tiny">
          {side === "buy"
            ? `Você recebe cerca de ${formatUnits(units)} ${coin.symbol.toUpperCase()}`
            : `Saldo disponível: ${s.money(holdValue)}`}
        </p>
        <button className="btn btn-gold btn-lg" style={{ width: "100%" }} onClick={submit}>
          {side === "buy" ? `Investir ${s.money(value || 0)}` : `Vender ${s.money(value || 0)}`}
        </button>
      </div>
    </section>
  );
}
