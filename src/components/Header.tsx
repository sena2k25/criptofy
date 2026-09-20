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
          {s.user ? (
            <div className="balance-pill">
              <span className="cash">{s.money(s.cash)}</span>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => s.setCashOpen("deposit")}>
                Depósito
              </button>
              <CountryPick />
              <button type="button" className="btn btn-ghost btn-sm hide-sm" onClick={() => s.setCashOpen("withdraw")}>
                Saque
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={s.logout}>
                Sair
              </button>
            </div>
          ) : (
            <>
              <CountryPick />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => s.setAuthOpen("login")}>
                Entrar
              </button>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => s.setAuthOpen("register")}>
                Criar conta
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
