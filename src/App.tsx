import { AuthModal, CashModal, Toasts } from "./components/Overlays";
import { Header } from "./components/Header";
import { Asset } from "./pages/Asset";
import { Home } from "./pages/Home";
import { Market } from "./pages/Market";
import { Wallet } from "./pages/Wallet";
import { useStore } from "./store";

export function App() {
  const { page } = useStore();
  return (
    <div className="app">
      <Header />
      <main className="main">
        {page === "home" && <Home />}
        {page === "market" && <Market />}
        {page === "asset" && <Asset />}
        {page === "wallet" && <Wallet />}
      </main>
      <footer className="footer">
        <div className="wrap">
          <strong>CRIPTOFY</strong>
          <p>Investimento em criptomoedas. Não é a plataforma ARENA. Preços em tempo real via mercado.</p>
        </div>
      </footer>
      <AuthModal />
      <CashModal />
      <Toasts />
    </div>
  );
}
