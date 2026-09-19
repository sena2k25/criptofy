import { useEffect, useState } from "react";
import { MIN_DEPOSIT, MIN_WITHDRAW, useStore } from "../store";

export function AuthModal() {
  const s = useStore();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  if (!s.authOpen) return null;
  const register = s.authOpen === "register";
  return (
    <div className="modal-bg" onClick={() => s.setAuthOpen(null)}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.includes("@")) return;
          s.login(email, register ? name : undefined);
        }}
      >
        <h3>{register ? "Abrir conta" : "Entrar"}</h3>
        <p className="muted">A CRIPTOFY guarda seu portfólio neste aparelho.</p>
        {register ? (
          <label className="field">
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
          </label>
        ) : null}
        <label className="field">
          <span>E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="voce@email.com" />
        </label>
        <button className="btn btn-gold btn-lg" style={{ width: "100%" }} type="submit">
          {register ? "Começar a investir" : "Entrar"}
        </button>
        <button type="button" className="linkish" onClick={() => s.setAuthOpen(register ? "login" : "register")}>
          {register ? "Já tenho conta" : "Criar conta"}
        </button>
      </form>
    </div>
  );
}

export function CashModal() {
  const s = useStore();
  const withdraw = s.cashOpen === "withdraw";
  const [amount, setAmount] = useState("200");
  useEffect(() => {
    if (s.cashOpen === "withdraw") setAmount(s.cash >= 200 ? "200" : s.cash > 0 ? s.cash.toFixed(2) : String(MIN_WITHDRAW));
    if (s.cashOpen === "deposit") setAmount("200");
  }, [s.cashOpen, s.cash]);
  if (!s.cashOpen) return null;
  const min = withdraw ? MIN_WITHDRAW : MIN_DEPOSIT;
  const picks = withdraw ? ["50", "100", "200"] : ["100", "200", "500", "1000"];
  return (
    <div className="modal-bg" onClick={() => s.setCashOpen(null)}>
      <form
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const value = Number(amount.replace(",", "."));
          if (withdraw) s.withdraw(value);
          else s.deposit(value);
        }}
      >
        <h3>{withdraw ? "Saque" : "Depósito"}</h3>
        <p className="muted">
          {withdraw
            ? `Saldo disponível: ${s.money(s.cash)}. O valor sai da conta em reais.`
            : "O saldo em reais vira poder de compra no mercado."}
        </p>
        <div className="picks">
          {picks.map((v) => (
            <button key={v} type="button" className={amount === v ? "on" : ""} onClick={() => setAmount(v)}>
              R$ {v}
            </button>
          ))}
          {withdraw && s.cash > 0 ? (
            <button type="button" className={amount === s.cash.toFixed(2) ? "on" : ""} onClick={() => setAmount(s.cash.toFixed(2))}>
              Tudo
            </button>
          ) : null}
        </div>
        <label className="field">
          <span>Valor (mín. {s.money(min)})</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button className="btn btn-gold btn-lg" style={{ width: "100%" }} type="submit">
          {withdraw ? "Confirmar saque" : "Confirmar depósito"}
        </button>
      </form>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
