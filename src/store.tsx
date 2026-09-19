import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatBRL, formatPrice } from "./lib/crypto";
import { FALLBACK_RATES, countryById, fetchRates, formatMoney, loadCountry, saveCountry } from "./lib/currency";

export type Page = "home" | "market" | "asset" | "wallet";
export type User = { name: string; email: string };
export type Holding = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  units: number;
  invested: number;
};
export type Movement = {
  id: string;
  kind: "deposit" | "withdraw" | "buy" | "sell" | "bonus";
  label: string;
  amount: number;
  at: string;
};
export type Toast = { id: string; text: string; kind: "ok" | "err" | "info" };

const KEY = "criptofy-v1";
export const MIN_DEPOSIT = 10;
export const MIN_WITHDRAW = 10;
export const MIN_INVEST = 5;
export const FLAG_BONUS = 23.9;

type Persist = {
  user: User | null;
  cash: number;
  holdings: Holding[];
  movements: Movement[];
};

function load(): Persist {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem("volta-invest-v1");
    if (raw) return JSON.parse(raw) as Persist;
  } catch {
    /* ignore */
  }
  return { user: null, cash: 0, holdings: [], movements: [] };
}

function save(data: Persist) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

type Store = Persist & {
  page: Page;
  assetId: string;
  authOpen: "login" | "register" | null;
  cashOpen: "deposit" | "withdraw" | null;
  country: string;
  toasts: Toast[];
  setPage: (p: Page) => void;
  openAsset: (id: string) => void;
  setAuthOpen: (v: "login" | "register" | null) => void;
  setCashOpen: (v: "deposit" | "withdraw" | null) => void;
  setCountry: (id: string) => void;
  login: (email: string, name?: string) => void;
  logout: () => void;
  deposit: (amount: number) => boolean;
  withdraw: (amount: number) => boolean;
  buy: (coin: { id: string; symbol: string; name: string; image: string; price: number }, amount: number) => boolean;
  sell: (coinId: string, amount: number, price: number) => boolean;
  toast: (text: string, kind?: Toast["kind"]) => void;
  money: (v: number) => string;
  price: (v: number) => string;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [user, setUser] = useState<User | null>(initial.user);
  const [cash, setCash] = useState(initial.cash);
  const [holdings, setHoldings] = useState<Holding[]>(initial.holdings);
  const [movements, setMovements] = useState<Movement[]>(initial.movements);
  const [page, setPage] = useState<Page>("home");
  const [assetId, setAssetId] = useState("bitcoin");
  const [authOpen, setAuthOpen] = useState<"login" | "register" | null>(null);
  const [cashOpen, setCashOpen] = useState<"deposit" | "withdraw" | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [country, setCountryId] = useState(loadCountry);
  const [fx, setFx] = useState<Record<string, number>>(FALLBACK_RATES);

  useEffect(() => {
    void fetchRates()
      .then(setFx)
      .catch(() => setFx(FALLBACK_RATES));
  }, []);

  const persist = useCallback(
    (patch: Partial<Persist>) => {
      save({
        user: patch.user !== undefined ? patch.user : user,
        cash: patch.cash !== undefined ? patch.cash : cash,
        holdings: patch.holdings !== undefined ? patch.holdings : holdings,
        movements: patch.movements !== undefined ? patch.movements : movements,
      });
    },
    [user, cash, holdings, movements],
  );

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((cur) => [...cur, { id, text, kind }].slice(-4));
    window.setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3200);
  }, []);

  const login = (email: string, name?: string) => {
    const next = { email: email.trim().toLowerCase(), name: (name || email.split("@")[0] || "Investidor").trim() };
    setUser(next);
    persist({ user: next });
    setAuthOpen(null);
    toast(`Bem-vindo, ${next.name}.`, "ok");
  };

  const logout = () => {
    setUser(null);
    persist({ user: null });
    toast("Sessão encerrada.", "info");
  };

  const setCountry = (id: string) => {
    const next = countryById(id);
    if (next.id === country) return;
    setCountryId(next.id);
    saveCountry(next.id);
    if (!user) {
      toast(`Moeda: ${next.name}. Entre para ganhar ${formatBRL(FLAG_BONUS)} ao trocar o país.`, "info");
      return;
    }
    const nextCash = +(cash + FLAG_BONUS).toFixed(2);
    const mov: Movement = {
      id: `flag-${Date.now()}`,
      kind: "bonus",
      label: `Bônus ${next.name}`,
      amount: FLAG_BONUS,
      at: new Date().toISOString(),
    };
    const nextMov = [mov, ...movements].slice(0, 40);
    setCash(nextCash);
    setMovements(nextMov);
    persist({ cash: nextCash, movements: nextMov });
    toast(`+${formatBRL(FLAG_BONUS)} por escolher ${next.name}.`, "ok");
  };

  const deposit = (amount: number) => {
    if (!user) {
      setAuthOpen("register");
      return false;
    }
    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT) {
      toast(`Depósito mínimo: ${formatBRL(MIN_DEPOSIT)}.`, "err");
      return false;
    }
    const next = +(cash + amount).toFixed(2);
    const mov: Movement = {
      id: `d-${Date.now()}`,
      kind: "deposit",
      label: "Depósito em reais",
      amount,
      at: new Date().toISOString(),
    };
    const nextMov = [mov, ...movements].slice(0, 40);
    setCash(next);
    setMovements(nextMov);
    persist({ cash: next, movements: nextMov });
    setCashOpen(null);
    toast(`Depósito de ${formatBRL(amount)} na conta.`, "ok");
    return true;
  };

  const withdraw = (amount: number) => {
    if (!user) {
      setAuthOpen("login");
      return false;
    }
    if (!Number.isFinite(amount) || amount < MIN_WITHDRAW) {
      toast(`Saque mínimo: ${formatBRL(MIN_WITHDRAW)}.`, "err");
      return false;
    }
    if (amount > cash) {
      toast("Saldo em reais insuficiente para sacar.", "err");
      return false;
    }
    const next = +(cash - amount).toFixed(2);
    const mov: Movement = {
      id: `w-${Date.now()}`,
      kind: "withdraw",
      label: "Saque em reais",
      amount: -amount,
      at: new Date().toISOString(),
    };
    const nextMov = [mov, ...movements].slice(0, 40);
    setCash(next);
    setMovements(nextMov);
    persist({ cash: next, movements: nextMov });
    setCashOpen(null);
    toast(`Saque de ${formatBRL(amount)} realizado.`, "ok");
    return true;
  };

  const buy = (coin: { id: string; symbol: string; name: string; image: string; price: number }, amount: number) => {
    if (!user) {
      setAuthOpen("login");
      return false;
    }
    if (!Number.isFinite(amount) || amount < MIN_INVEST) {
      toast(`Investimento mínimo: ${formatBRL(MIN_INVEST)}.`, "err");
      return false;
    }
    if (coin.price <= 0) {
      toast("Preço indisponível agora.", "err");
      return false;
    }
    if (amount > cash) {
      toast("Saldo em reais insuficiente.", "err");
      setCashOpen("deposit");
      return false;
    }
    const units = amount / coin.price;
    const nextCash = +(cash - amount).toFixed(2);
    const cur = holdings.find((h) => h.id === coin.id);
    const nextHold = cur
      ? holdings.map((h) =>
          h.id === coin.id
            ? { ...h, units: h.units + units, invested: +(h.invested + amount).toFixed(2), image: coin.image || h.image }
            : h,
        )
      : [
          { id: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image, units, invested: amount },
          ...holdings,
        ];
    const mov: Movement = {
      id: `b-${Date.now()}`,
      kind: "buy",
      label: `Compra de ${coin.symbol.toUpperCase()}`,
      amount: -amount,
      at: new Date().toISOString(),
    };
    const nextMov = [mov, ...movements].slice(0, 40);
    setCash(nextCash);
    setHoldings(nextHold);
    setMovements(nextMov);
    persist({ cash: nextCash, holdings: nextHold, movements: nextMov });
    toast(`Investiu ${formatBRL(amount)} em ${coin.symbol.toUpperCase()}.`, "ok");
    return true;
  };

  const sell = (coinId: string, amount: number, price: number) => {
    const hold = holdings.find((h) => h.id === coinId);
    if (!hold || price <= 0) return false;
    const max = hold.units * price;
    if (!Number.isFinite(amount) || amount <= 0 || amount > max + 0.01) {
      toast("Valor de venda inválido.", "err");
      return false;
    }
    const units = Math.min(hold.units, amount / price);
    const received = +(units * price).toFixed(2);
    const leftUnits = hold.units - units;
    const leftInvested = leftUnits <= 0.00000001 ? 0 : +((hold.invested * leftUnits) / hold.units).toFixed(2);
    const nextHold =
      leftUnits <= 0.00000001 ? holdings.filter((h) => h.id !== coinId) : holdings.map((h) => (h.id === coinId ? { ...h, units: leftUnits, invested: leftInvested } : h));
    const nextCash = +(cash + received).toFixed(2);
    const mov: Movement = {
      id: `s-${Date.now()}`,
      kind: "sell",
      label: `Venda de ${hold.symbol.toUpperCase()}`,
      amount: received,
      at: new Date().toISOString(),
    };
    const nextMov = [mov, ...movements].slice(0, 40);
    setCash(nextCash);
    setHoldings(nextHold);
    setMovements(nextMov);
    persist({ cash: nextCash, holdings: nextHold, movements: nextMov });
    toast(`Vendeu ${hold.symbol.toUpperCase()} por ${formatBRL(received)}.`, "ok");
    return true;
  };

  const value = useMemo<Store>(
    () => ({
      user,
      cash,
      holdings,
      movements,
      page,
      assetId,
      authOpen,
      cashOpen,
      country,
      toasts,
      setPage,
      openAsset: (id) => {
        setAssetId(id);
        setPage("asset");
      },
      setAuthOpen,
      setCashOpen,
      setCountry,
      login,
      logout,
      deposit,
      withdraw,
      buy,
      sell,
      toast,
      money: (v: number) => formatMoney(v, country, fx),
      price: (v: number) => formatPrice(v, country, fx),
    }),
    [user, cash, holdings, movements, page, assetId, authOpen, cashOpen, country, fx, toasts, persist, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore");
  return ctx;
}
