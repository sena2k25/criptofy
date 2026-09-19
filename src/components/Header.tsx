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
        <button className="logo" onClick={() => s.setPage("home")}>
          CRIPTOFY
        </button>
        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.id} className={s.page === n.id || (n.id === "market" && s.page === "asset") ? "on" : ""} onClick={() => s.setPage(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="util">
          {s.user ? <span className="cash">{s.money(s.cash)}</span> : null}
          <CountryPick />
          {s.user ? (
            <>
              <button className="btn btn-gold btn-sm" onClick={() => s.setCashOpen("deposit")}>
                Depósito
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => s.setCashOpen("withdraw")}>
                Saque
              </button>
              <button className="btn btn-ghost btn-sm" onClick={s.logout}>
                Sair
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => s.setAuthOpen("login")}>
                Entrar
              </button>
              <button className="btn btn-gold btn-sm" onClick={() => s.setAuthOpen("register")}>
                Criar conta
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
