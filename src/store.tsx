import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { formatBRL, formatPrice } from "./lib/crypto";
import { FALLBACK_RATES, countryById, fetchRates, formatMoney, loadCountry, saveCountry } from "./lib/currency";

export type Page = "home" | "market" | "asset" | "wallet";
export type PixKeyType = "cpf" | "phone" | "email" | "random";
export type User = { name: string; email: string; pixKey?: string; pixKeyType?: PixKeyType };
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
  status?: "pending" | "approved";
  pixKey?: string;
  approveAt?: string;
};
export type Toast = { id: string; text: string; kind: "ok" | "err" | "info" };

const KEY = "criptofy-v1";
const ACCOUNTS_KEY = "criptofy-accounts";
export const MIN_DEPOSIT = 10;
export const MIN_WITHDRAW = 10;
export const MAX_DEPOSIT = 50_000;
export const MIN_INVEST = 5;
export const FLAG_BONUS = 100;
const WITHDRAW_PENDING_MS = 20_000;

type Persist = {
  user: User | null;
  cash: number;
  holdings: Holding[];
  movements: Movement[];
  creditedPix: string[];
};

type Account = {
  name: string;
  email: string;
  password: string;
  cash: number;
  holdings: Holding[];
  movements: Movement[];
  creditedPix: string[];
  pixKey?: string;
  pixKeyType?: PixKeyType;
};

function loadAccounts(): Record<string, Account> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, Account>;
  } catch {
    /* ignore */
  }
  return {};
}

function saveAccounts(accounts: Record<string, Account>) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function load(): Persist {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem("volta-invest-v1");
    if (raw) {
      const data = JSON.parse(raw) as Persist;
      const next = { ...data, creditedPix: data.creditedPix || [] };
      if (next.user?.email) {
        const accounts = loadAccounts();
        const email = next.user.email.toLowerCase();
        if (!accounts[email]) {
          accounts[email] = {
            name: next.user.name,
            email,
            password: "",
            cash: next.cash || 0,
            holdings: next.holdings || [],
            movements: next.movements || [],
            creditedPix: next.creditedPix || [],
            pixKey: next.user.pixKey,
            pixKeyType: next.user.pixKeyType,
          };
          saveAccounts(accounts);
        }
      }
      return next;
    }
  } catch {
    /* ignore */
  }
  return { user: null, cash: 0, holdings: [], movements: [], creditedPix: [] };
}

function save(data: Persist) {
  localStorage.setItem(KEY, JSON.stringify(data));
  if (data.user?.email) {
    const email = data.user.email.toLowerCase();
    const accounts = loadAccounts();
    const prev = accounts[email];
    accounts[email] = {
      name: data.user.name,
      email,
      password: prev?.password || "",
      cash: data.cash,
      holdings: data.holdings,
      movements: data.movements,
      creditedPix: data.creditedPix,
      pixKey: data.user.pixKey,
      pixKeyType: data.user.pixKeyType,
    };
    saveAccounts(accounts);
  }
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
  login: (email: string, password: string, opts?: { name?: string; mode?: "login" | "register" }) => string | null;
  logout: () => void;
  confirmPix: (pixId: string, amount: number) => boolean;
  addDepositPending: (id: string, amount: number) => void;
  withdraw: (amount: number, pixKey: string, pixKeyType: PixKeyType) => boolean;
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
  const [creditedPix, setCreditedPix] = useState<string[]>(initial.creditedPix || []);
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
        creditedPix: patch.creditedPix !== undefined ? patch.creditedPix : creditedPix,
      });
    },
    [user, cash, holdings, movements, creditedPix],
  );

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((cur) => [...cur, { id, text, kind }].slice(-4));
    window.setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== id)), 3200);
  }, []);

  const login = (email: string, password: string, opts?: { name?: string; mode?: "login" | "register" }) => {
    const mode = opts?.mode || "login";
    const cleanEmail = email.trim().toLowerCase();
    const pass = password.trim();
    if (!cleanEmail.includes("@")) return "Informe um e-mail válido.";
    if (pass.length < 4) return "A senha precisa ter pelo menos 4 caracteres.";

    const accounts = loadAccounts();

    if (mode === "register") {
      const name = (opts?.name || "").trim();
      if (name.length < 2) return "Informe seu nome.";
      if (accounts[cleanEmail]) return "Já existe uma conta com este e-mail.";
      const nextUser: User = { name, email: cleanEmail };
      accounts[cleanEmail] = {
        name,
        email: cleanEmail,
        password: pass,
        cash: 0,
        holdings: [],
        movements: [],
        creditedPix: [],
      };
      saveAccounts(accounts);
      setUser(nextUser);
      setCash(0);
      setHoldings([]);
      setMovements([]);
      setCreditedPix([]);
      persist({ user: nextUser, cash: 0, holdings: [], movements: [], creditedPix: [] });
      setAuthOpen(null);
      toast(`Conta criada. Bem-vindo, ${name}.`, "ok");
      return null;
    }

    const account = accounts[cleanEmail];
    if (!account) return "Conta não encontrada. Crie uma conta.";
    if (account.password && account.password !== pass) return "E-mail ou senha incorretos.";
    if (!account.password) {
      account.password = pass;
      saveAccounts(accounts);
    }

    const nextUser: User = {
      name: account.name,
      email: account.email,
      pixKey: account.pixKey,
      pixKeyType: account.pixKeyType,
    };
    setUser(nextUser);
    setCash(account.cash || 0);
    setHoldings(account.holdings || []);
    setMovements(account.movements || []);
    setCreditedPix(account.creditedPix || []);
    persist({
      user: nextUser,
      cash: account.cash || 0,
      holdings: account.holdings || [],
      movements: account.movements || [],
      creditedPix: account.creditedPix || [],
    });
    setAuthOpen(null);
    toast(`Bem-vindo, ${nextUser.name}.`, "ok");
    return null;
  };

  const logout = () => {
    if (user) {
      persist({ user, cash, holdings, movements, creditedPix });
    }
    setUser(null);
    setCash(0);
    setHoldings([]);
    setMovements([]);
    setCreditedPix([]);
    setCashOpen(null);
    setAuthOpen(null);
    save({ user: null, cash: 0, holdings: [], movements: [], creditedPix: [] });
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
    toast(`+${formatBRL(FLAG_BONUS)} creditados no saldo por escolher ${next.name}.`, "ok");
  };

  const confirmPix = useCallback(
    (pixId: string, amount: number) => {
      if (!pixId || creditedPix.includes(pixId)) return false;
      const next = +(cash + amount).toFixed(2);
      const ids = [...creditedPix, pixId];
      const txs = movements.some((m) => m.id === pixId)
        ? movements.map((m) => (m.id === pixId ? { ...m, status: "approved" as const } : m))
        : [
            {
              id: pixId,
              kind: "deposit" as const,
              label: "Depósito Pix",
              amount,
              at: new Date().toISOString(),
              status: "approved" as const,
            },
            ...movements,
          ];
      setCash(next);
      setCreditedPix(ids);
      setMovements(txs.slice(0, 40));
      persist({ cash: next, creditedPix: ids, movements: txs.slice(0, 40) });
      toast(`Pix de ${formatBRL(amount)} confirmado.`, "ok");
      return true;
    },
    [cash, creditedPix, movements, persist, toast],
  );

  const addDepositPending = (id: string, amount: number) => {
    if (movements.some((m) => m.id === id)) return;
    const tx: Movement = {
      id,
      kind: "deposit",
      label: "Depósito Pix",
      amount,
      at: new Date().toISOString(),
      status: "pending",
    };
    const next = [tx, ...movements].slice(0, 40);
    setMovements(next);
    persist({ movements: next });
  };

  const approveMovement = useCallback(
    (id: string) => {
      setMovements((cur) => {
        const next = cur.map((m) => (m.id === id && m.status === "pending" ? { ...m, status: "approved" as const } : m));
        persist({ movements: next });
        const done = cur.find((m) => m.id === id && m.status === "pending");
        if (done?.kind === "withdraw") toast("Saque Pix aprovado.", "ok");
        return next;
      });
    },
    [persist, toast],
  );

  useEffect(() => {
    const now = Date.now();
    const timers = movements
      .filter((m) => m.kind === "withdraw" && m.status === "pending" && m.approveAt)
      .map((m) => {
        const left = new Date(m.approveAt!).getTime() - now;
        if (left <= 0) {
          approveMovement(m.id);
          return 0;
        }
        return window.setTimeout(() => approveMovement(m.id), left);
      });
    return () => timers.forEach((t) => t && window.clearTimeout(t));
  }, [movements, approveMovement]);

  const withdraw = (amount: number, pixKey: string, pixKeyType: PixKeyType) => {
    const key = pixKey.trim();
    if (!user) {
      setAuthOpen("login");
      return false;
    }
    if (!key) {
      toast("Informe a chave Pix para receber o saque.", "err");
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
    const nextUser = { ...user, pixKey: key, pixKeyType };
    const mov: Movement = {
      id: `w-${Date.now()}`,
      kind: "withdraw",
      label: "Saque Pix",
      amount: -amount,
      at: new Date().toISOString(),
      status: "pending",
      pixKey: key,
      approveAt: new Date(Date.now() + WITHDRAW_PENDING_MS).toISOString(),
    };
    const nextMov = [mov, ...movements].slice(0, 40);
    setCash(next);
    setUser(nextUser);
    setMovements(nextMov);
    persist({ cash: next, user: nextUser, movements: nextMov });
    setCashOpen(null);
    toast(`Saque de ${formatBRL(amount)} pendente para ${key}.`, "ok");
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
      confirmPix,
      addDepositPending,
      withdraw,
      buy,
      sell,
      toast,
      money: (v: number) => formatMoney(v, country, fx),
      price: (v: number) => formatPrice(v, country, fx),
    }),
    [user, cash, holdings, movements, page, assetId, authOpen, cashOpen, country, fx, toasts, persist, toast, confirmPix],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore");
  return ctx;
}
