import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COUNTRIES, countryById } from "../lib/currency";
import { FLAG_BONUS, useStore } from "../store";
import { Flag } from "./Flag";

export function CountryPick({ variant = "header" }: { variant?: "header" | "wide" | "tab" }) {
  const { country, setCountry, money } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = countryById(country);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const hide = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (box.current?.contains(t) || t.closest(".fx-menu") || t.closest(".fx-sheet-bg")) return;
      setOpen(false);
    };
    const timer = window.setTimeout(() => document.addEventListener("pointerdown", hide), 50);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", hide);
    };
  }, [open]);

  const menu = (
    <>
      <button type="button" className="fx-sheet-bg" aria-label="Fechar países" onClick={() => setOpen(false)} />
      <div className="fx-menu" role="listbox" aria-label="País e moeda" onPointerDown={(e) => e.stopPropagation()}>
        <div className="fx-menu-head">
          <span>País e moeda · ganhe {money(FLAG_BONUS)}</span>
          <button type="button" className="fx-close" aria-label="Fechar" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        {COUNTRIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={c.id === country}
            className={c.id === country ? "on" : ""}
            onClick={() => {
              setCountry(c.id);
              setOpen(false);
            }}
          >
            <Flag id={c.id} />
            <span className="fx-name">{c.name}</span>
            <small>{c.currency}</small>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className={`fx-pick${open ? " open" : ""}`} ref={box}>
      <button
        type="button"
        className={
          variant === "tab"
            ? `fx-tab${open ? " on" : ""}`
            : `fx-btn${open ? " open" : ""}${variant === "wide" ? " fx-wide" : ""}`
        }
        aria-label={`País: ${current.name}`}
        aria-expanded={open}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={variant === "tab" ? "tab-ico" : undefined}>
          <Flag id={current.id} />
        </span>
        {variant === "wide" ? <span className="fx-label">{current.name}</span> : null}
        {variant === "tab" ? <span>{current.currency}</span> : <span className="fx-code">{current.currency}</span>}
        {variant === "tab" ? null : (
          <span className="fx-caret" aria-hidden>
            ▾
          </span>
        )}
      </button>
      {open ? createPortal(menu, document.body) : null}
    </div>
  );
}
