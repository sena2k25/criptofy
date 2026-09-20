import { useEffect, useState } from "react";
import { CoinIcon } from "../components/CoinIcon";
import { fetchMarkets, fetchPrices, formatCompact, LIVE_MS, mergeQuotes, type MarketCoin } from "../lib/crypto";
import { useStore } from "../store";

export function Home() {
  const s = useStore();
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [catalog, setCatalog] = useState(0);
  const ids = coins.map((c) => c.id).join(",");

  useEffect(() => {
    void fetchMarkets(1)
      .then((pack) => {
        setCoins(pack.coins.slice(0, 8));
        setCatalog(pack.catalog);
      })
      .catch(() => setCoins([]));
  }, []);

  useEffect(() => {
    if (!ids) return;
    let first = true;
    const tick = async () => {
      const prices = await fetchPrices(ids.split(","));
      setCoins((cur) => mergeQuotes(cur, prices, first));
      first = false;
    };
    void tick();
    const timer = window.setInterval(() => void tick(), LIVE_MS);
    return () => window.clearInterval(timer);
  }, [ids]);

  return (
    <>
      <section className="wrap">
        <div className="hero">
          <p className="kicker">Investimento em cripto</p>
          <h1>Compre o mercado. Acompanhe o retorno.</h1>
          <p>
            A CRIPTOFY é uma plataforma de investimento. Você deposita em reais, escolhe a moeda e monta sua carteira — Bitcoin,
            Ethereum e mais de {catalog ? catalog.toLocaleString("pt-BR") : "20 mil"} criptos.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gold btn-lg" onClick={() => (s.user ? s.setPage("market") : s.setAuthOpen("register"))}>
              {s.user ? "Ver mercado" : "Abrir conta"}
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => s.setPage("market")}>
              Explorar moedas
            </button>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="between">
          <h2>Em destaque</h2>
          <button className="more" onClick={() => s.setPage("market")}>
            Mercado completo ›
          </button>
        </div>
        <div className="coin-grid">
          {coins.map((c) => (
            <button key={c.id} className={`coin-card ${c.tick === "up" ? "tick-up" : c.tick === "down" ? "tick-down" : ""}`} onClick={() => s.openAsset(c.id)}>
              <CoinIcon image={c.image} symbol={c.symbol} name={c.name} />
              <div>
                <strong>{c.symbol.toUpperCase()}</strong>
                <small>{c.name}</small>
              </div>
              <div className="coin-px">
                <b className={c.tick === "up" ? "up" : c.tick === "down" ? "down" : ""}>
                  {c.tick === "up" ? "▲ " : c.tick === "down" ? "▼ " : ""}
                  {s.price(c.price)}
                </b>
                <em className={(c.change24h || 0) >= 0 ? "up" : "down"}>
                  {(c.change24h || 0) >= 0 ? "+" : ""}
                  {(c.change24h || 0).toFixed(2)}%
                </em>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <h2>Como investir</h2>
        <div className="steps">
          <article>
            <span>01</span>
            <h3>Deposite reais</h3>
            <p>Faça um depósito via Pix. O saldo entra quando o pagamento confirmar.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Escolha a moeda</h3>
            <p>Veja o gráfico, a cotação e o tamanho do mercado.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Compre e acompanhe</h3>
            <p>O lucro ou prejuízo aparece na carteira em tempo real. Venda quando quiser.</p>
          </article>
        </div>
        <p className="tiny note">Cap de mercado das líderes: {coins[0] ? formatCompact(coins[0].marketCap) : "—"}. Sem aposta de alta ou baixa — só investimento.</p>
      </section>
    </>
  );
}
