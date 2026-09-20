import { CountryPick } from "./CountryPick";
import { useStore, type Page } from "../store";

const NAV: { id: Page; label: string }[] = [
  { id: "home", label: "Início" },
  { id: "market", label: "Mercado" },
  { id: "wallet", label: "Carteira" },
];

export function Header() {
  const s = useStore();
  return (
    <header className="header">
      <div className="wrap header-in">
        <button type="button" className="logo" onClick={() => s.setPage("home")}>
          CRIPTOFY
        </button>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={s.page === n.id || (n.id === "market" && s.page === "asset") ? "on" : ""}
              onClick={() => s.setPage(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="util">
          {s.user ? <span className="cash">{s.money(s.cash)}</span> : null}
          <CountryPick />
          {s.user ? (
            <>
              <button type="button" className="btn btn-gold btn-sm hide-sm" onClick={() => s.setCashOpen("deposit")}>
                Depósito
              </button>
              <button type="button" className="btn btn-ghost btn-sm hide-sm" onClick={() => s.setCashOpen("withdraw")}>
                Saque
              </button>
              <button type="button" className="btn btn-ghost btn-sm hide-sm" onClick={s.logout}>
                Sair
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost btn-sm hide-sm" onClick={() => s.setAuthOpen("login")}>
                Entrar
              </button>
              <button type="button" className="btn btn-gold btn-sm hide-sm" onClick={() => s.setAuthOpen("register")}>
                Criar conta
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mobile-bar wrap">
        {s.user ? (
          <>
            <button type="button" className="btn btn-gold" onClick={() => s.setCashOpen("deposit")}>
              Depósito
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => s.setCashOpen("withdraw")}>
              Saque
            </button>
            <button type="button" className="btn btn-ghost" onClick={s.logout}>
              Sair
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => s.setAuthOpen("login")}>
              Entrar
            </button>
            <button type="button" className="btn btn-gold mobile-span" onClick={() => s.setAuthOpen("register")}>
              Criar conta
            </button>
          </>
        )}
      </div>
    </header>
  );
}
