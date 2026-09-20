import { useCallback, useEffect, useState } from "react";
import { checkPix, createPix, type PixCharge } from "../lib/pix";
import { formatBRL } from "../lib/crypto";
import { MAX_DEPOSIT, MIN_DEPOSIT, MIN_WITHDRAW, useStore, type PixKeyType } from "../store";

const PIX_TYPES: { id: PixKeyType; label: string; placeholder: string }[] = [
  { id: "cpf", label: "CPF", placeholder: "000.000.000-00" },
  { id: "phone", label: "Celular", placeholder: "(11) 99999-0000" },
  { id: "email", label: "E-mail", placeholder: "seuemail@email.com" },
  { id: "random", label: "Aleatória", placeholder: "chave aleatória" },
];

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
  const out = s.cashOpen === "withdraw";
  const [amount, setAmount] = useState("200");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [pixType, setPixType] = useState<PixKeyType>(s.user?.pixKeyType || "cpf");
  const [pixKey, setPixKey] = useState(s.user?.pixKey || "");

  const startDeposit = useCallback(
    async (raw: number) => {
      if (!s.user) {
        s.setCashOpen(null);
        s.setAuthOpen("register");
        s.toast("Crie uma conta para depositar.", "info");
        return;
      }
      if (!Number.isFinite(raw) || raw < MIN_DEPOSIT) {
        setError(`Depósito mínimo: ${formatBRL(MIN_DEPOSIT)}.`);
        return;
      }
      if (raw > MAX_DEPOSIT) {
        setError(`Valor máximo do Pix: ${formatBRL(MAX_DEPOSIT)}.`);
        return;
      }
      setAmount(String(raw));
      setBusy(true);
      setError("");
      try {
        const next = await createPix(raw, `Depósito CRIPTOFY ${s.user.email}`);
        s.addDepositPending(next.id, next.amount);
        setCharge(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao gerar o Pix.");
      } finally {
        setBusy(false);
      }
    },
    [s],
  );

  useEffect(() => {
    if (!s.cashOpen) {
      setCharge(null);
      setBusy(false);
      setError("");
      setCopied(false);
      setPixType(s.user?.pixKeyType || "cpf");
      setPixKey(s.user?.pixKey || "");
    }
  }, [s.cashOpen, s.user?.pixKey, s.user?.pixKeyType]);

  useEffect(() => {
    if (!charge?.id || charge.paid) return;
    const id = charge.id;
    const paidAmount = charge.amount;
    let stop = false;
    const tick = async () => {
      try {
        const next = await checkPix(id);
        if (stop) return;
        if (next.paid) {
          setCharge((cur) => (cur && cur.id === id ? { ...cur, paid: true } : cur));
          s.confirmPix(next.id || id, paidAmount);
          return;
        }
        setCharge((cur) => (cur && cur.id === id ? { ...cur, status: next.status, paid: next.paid } : cur));
      } catch {
        /* tenta de novo */
      }
    };
    const timer = window.setInterval(() => void tick(), 3000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [charge?.id, charge?.paid, charge?.amount, s]);

  if (!s.cashOpen) return null;
  const value = Number(amount.replace(",", "."));
  const generating = !out && !charge && busy;
  const min = out ? MIN_WITHDRAW : MIN_DEPOSIT;
  const picks = out ? ["50", "100", "200"] : ["100", "200", "500", "1000"];

  const copyPix = async () => {
    if (!charge?.pixCopiaCola) return;
    try {
      await navigator.clipboard.writeText(charge.pixCopiaCola);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      s.toast("Não foi possível copiar. Selecione o código.", "err");
    }
  };

  return (
    <div className="modal-bg" onClick={() => s.setCashOpen(null)}>
      <form
        className="modal wallet-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (out) {
            if (!pixKey.trim()) {
              setError("Informe a chave Pix para receber.");
              return;
            }
            s.withdraw(value, pixKey, pixType);
            return;
          }
          await startDeposit(value);
        }}
      >
        <h3>{out ? "Saque via Pix" : "Depósito via Pix"}</h3>
        {out ? (
          <p className="muted">O saque sai via Pix para a chave informada. Saldo: {s.money(s.cash)}</p>
        ) : charge?.paid ? (
          <p className="tiny pix-ok-copy">Pagamento aprovado. O saldo já entrou na conta.</p>
        ) : charge ? (
          <p className="muted">Pague no app do banco. O saldo entra quando o Pix confirmar.</p>
        ) : (
          <p className="muted">Gere o QR Code NexusPag. O valor vira saldo para investir.</p>
        )}

        {generating ? (
          <div className="pix-box pix-wait">
            <p className="tiny pix-wait">Gerando Pix de {formatBRL(value)}…</p>
          </div>
        ) : charge && !out ? (
          <div className={`pix-box ${charge.paid ? "is-paid" : ""}`}>
            <div className={`pix-qr-wrap ${charge.paid ? "is-paid" : ""}`}>
              {charge.qrSrc ? <img className="pix-qr" src={charge.qrSrc} alt="QR Code Pix" /> : <div className="pix-qr pix-qr-fallback" />}
              {charge.paid ? (
                <div className="pix-verified" role="status" aria-label="Pagamento aprovado">
                  <span className="pix-verified-seal">✓</span>
                  <strong>Verificado</strong>
                  <em>Pagamento aprovado</em>
                </div>
              ) : null}
            </div>
            <p className={`tiny ${charge.paid ? "pix-ok" : "pix-wait"}`}>
              {charge.paid ? "Pagamento aprovado" : `Aguardando Pix de ${formatBRL(charge.amount)}…`}
            </p>
            {charge.paid ? null : (
              <>
                <p className="pix">{charge.pixCopiaCola}</p>
                <button type="button" className="btn btn-ghost" style={{ width: "100%" }} onClick={() => void copyPix()}>
                  {copied ? "Código copiado" : "Copiar Pix"}
                </button>
                <button type="button" className="linkish" onClick={() => setCharge(null)}>
                  Gerar outro valor
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {out ? (
              <div className="pix-key-box">
                <div className="picks">
                  {PIX_TYPES.map((t) => (
                    <button key={t.id} type="button" className={pixType === t.id ? "on" : ""} onClick={() => setPixType(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <label className="field">
                  <span>Chave para receber</span>
                  <input
                    required
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={PIX_TYPES.find((t) => t.id === pixType)?.placeholder}
                  />
                </label>
              </div>
            ) : null}
            <div className="picks">
              {picks.map((v) => (
                <button key={v} type="button" className={amount === v ? "on" : ""} onClick={() => setAmount(v)}>
                  R$ {v}
                </button>
              ))}
              {out && s.cash > 0 ? (
                <button type="button" onClick={() => setAmount(s.cash.toFixed(2))}>
                  Tudo
                </button>
              ) : null}
            </div>
            <label className="field">
              <span>Valor (mín. {formatBRL(min)}{out ? "" : ` · máx. ${formatBRL(MAX_DEPOSIT)}`})</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} />
            </label>
            {error ? <p className="warn">{error}</p> : null}
          </>
        )}

        {generating ? null : !charge || out ? (
          <button className="btn btn-gold btn-lg" style={{ width: "100%" }} type="submit" disabled={busy}>
            {out ? "Solicitar saque" : busy ? "Gerando Pix…" : "Gerar Pix"}
          </button>
        ) : (
          <button type="button" className="btn btn-gold btn-lg" style={{ width: "100%" }} onClick={() => s.setCashOpen(null)}>
            {charge.paid ? "Concluir" : "Fechar"}
          </button>
        )}
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
