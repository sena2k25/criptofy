import { useEffect, useState } from "react";
import { CoinIcon } from "../components/CoinIcon";
import { CountryPick } from "../components/CountryPick";
import { fetchPrices, formatUnits, LIVE_MS } from "../lib/crypto";
import { useStore } from "../store";

export function Wallet() {
  const s = useStore();
  const [quotes, setQuotes] = useState<Record<string, { price: number; change24h: number }>>({});

  useEffect(() => {
    const ids = s.holdings.map((h) => h.id);
    if (!ids.length) return;
    const tick = () => void fetchPrices(ids).then(setQuotes);
    void tick();
    const timer = window.setInterval(tick, LIVE_MS);
    return () => window.clearInterval(timer);
  }, [s.holdings.map((h) => h.id).join(",")]);

  const rows = s.holdings.map((h) => {
    const price = quotes[h.id]?.price || 0;
    const value = price * h.units;
    const pnl = value - h.invested;
    const pct = h.invested > 0 ? (pnl / h.invested) * 100 : 0;
    return { ...h, price, value, pnl, pct };
  });
  const invested = rows.reduce((a, r) => a + r.invested, 0);
  const cryptoValue = rows.reduce((a, r) => a + r.value, 0);
  const total = s.cash + cryptoValue;
  const pnl = cryptoValue - invested;

  if (!s.user) {
    return (
      <section className="wrap">
        <div className="page-head">
          <h1>Carteira</h1>
          <p className="muted">Entre para ver seus investimentos.</p>
        </div>
        <button className="btn btn-gold" onClick={() => s.setAuthOpen("register")}>
          Criar conta
        </button>
      </section>
    );
  }

  return (
    <section className="wrap">
      <div className="page-head">
        <h1>Carteira</h1>
        <p className="muted">Olá, {s.user.name}. Seu patrimônio combina reais e criptos.</p>
      </div>
      <div className="stats">
        <article>
          <span>Patrimônio</span>
          <b>{s.money(total)}</b>
        </article>
        <article>
          <span>Em reais</span>
          <b>{s.money(s.cash)}</b>
        </article>
        <article>
          <span>Em cripto</span>
          <b>{s.money(cryptoValue)}</b>
        </article>
        <article>
          <span>Resultado</span>
          <b className={pnl >= 0 ? "up" : "down"}>
            {pnl >= 0 ? "+" : ""}
            {s.money(pnl)}
          </b>
        </article>
      </div>
      <div className="cash-panel">
        <CountryPick variant="wide" />
        <div className="cash-row">
          <button type="button" className="btn btn-gold" onClick={() => s.setCashOpen("deposit")}>
            Depósito
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => s.setCashOpen("withdraw")}>
            Saque
          </button>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => s.setPage("market")}>
          Comprar cripto
        </button>
        <button type="button" className="btn btn-ghost" onClick={s.logout}>
          Sair
        </button>
      </div>
      <h2>Posições</h2>
      {rows.length ? (
        <div className="table">
          {rows.map((r) => (
            <button key={r.id} className="table-row" onClick={() => s.openAsset(r.id)}>
              <span className="row-coin">
                <CoinIcon image={r.image} symbol={r.symbol} name={r.name} size={28} />
                <span>
                  <strong>{r.symbol.toUpperCase()}</strong>
                  <small>
                    {formatUnits(r.units)} · médio {s.money(r.units ? r.invested / r.units : 0)}
                  </small>
                </span>
              </span>
              <b>{s.money(r.value)}</b>
              <em className={r.pnl >= 0 ? "up" : "down"}>
                {r.pnl >= 0 ? "+" : ""}
                {r.pct.toFixed(1)}%
              </em>
              <span className="hide-sm muted">{s.money(r.invested)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Nenhuma posição ainda. Abra o mercado e compre a primeira moeda.</p>
      )}
      <h2>Movimentos</h2>
      <div className="moves">
        {s.movements.length ? (
          s.movements.map((m) => (
            <div key={m.id} className="move">
              <div>
                <strong>
                  {m.label}
                  {m.status === "pending" ? " · pendente" : ""}
                </strong>
                <small>
                  {new Date(m.at).toLocaleString("pt-BR")}
                  {m.pixKey ? ` · ${m.pixKey}` : ""}
                </small>
              </div>
              <b className={m.amount >= 0 ? "up" : "down"}>
                {m.amount >= 0 ? "+" : ""}
                {s.money(m.amount)}
              </b>
            </div>
          ))
        ) : (
          <p className="muted">Sem movimentos.</p>
        )}
      </div>
    </section>
  );
}
