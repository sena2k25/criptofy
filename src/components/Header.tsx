import { CountryPick } from "./CountryPick";
import { useStore, type Page } from "../store";

const NAV: { id: Page; label: string }[] = [
  { id: "home", label: "Início" },
  { id: "market", label: "Mercado" },
  { id: "wallet", label: "Carteira" },
];

const TABS: { id: Page; label: string; icon: string }[] = [
  { id: "home", label: "Início", icon: "⌂" },
  { id: "market", label: "Mercado", icon: "◎" },
  { id: "wallet", label: "Carteira", icon: "▣" },
];

export function Header() {
  const s = useStore();
  const go = (p: Page) => {
    s.setPage(p);
  };
  const tabOn = (id: Page) => s.page === id || (id === "market" && s.page === "asset");

  return (
    <>
      <div className="topstick">
      <header className="header">
        <div className="wrap header-in">
          <button className="logo" onClick={() => go("home")}>
            CRIPTOFY
          </button>
          <nav className="nav">
            {NAV.map((n) => (
              <button key={n.id} className={tabOn(n.id) ? "on" : ""} onClick={() => go(n.id)}>
                {n.label}
              </button>
            ))}
          </nav>
          <div className="util">
            {s.user ? (
              <button type="button" className="cash" onClick={() => go("wallet")}>
                <small className="show-sm">Saldo</small>
                {s.money(s.cash)}
              </button>
            ) : (
              <div className="auth-row show-sm">
                <button type="button" className="btn btn-ghost" onClick={() => s.setAuthOpen("login")}>
                  Entrar
                </button>
                <button type="button" className="btn btn-gold" onClick={() => s.setAuthOpen("register")}>
                  Criar conta
                </button>
              </div>
            )}
            <div className="hide-sm">
              <CountryPick />
            </div>
            {s.user ? (
              <>
                <button className="btn btn-gold btn-sm hide-sm" onClick={() => s.setCashOpen("deposit")}>
                  Depósito
                </button>
                <button className="btn btn-ghost btn-sm hide-sm" onClick={() => s.setCashOpen("withdraw")}>
                  Saque
                </button>
                <button className="btn btn-ghost btn-sm hide-sm" onClick={s.logout}>
                  Sair
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm hide-sm" onClick={() => s.setAuthOpen("login")}>
                  Entrar
                </button>
                <button className="btn btn-gold btn-sm hide-sm" onClick={() => s.setAuthOpen("register")}>
                  Criar conta
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      </div>

      <nav className="tabbar" aria-label="Navegação">
        {TABS.map((t) => (
          <button key={t.id} className={tabOn(t.id) ? "on" : ""} onClick={() => go(t.id)}>
            <span className="tab-ico" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
