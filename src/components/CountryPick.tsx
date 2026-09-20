import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COUNTRIES, countryById } from "../lib/currency";
import { FLAG_MIN_BALANCE, useStore } from "../store";
import { Flag } from "./Flag";

export function CountryPick() {
  const { country, setCountry, money } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = countryById(country);

  useEffect(() => {
    if (!open) return;
    const hide = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (box.current?.contains(t) || t.closest(".fx-menu") || t.closest(".fx-sheet-bg")) return;
      setOpen(false);
    };
    const timer = window.setTimeout(() => document.addEventListener("pointerdown", hide), 50);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", hide);
    };
  }, [open]);

  return (
    <div className={`fx-pick${open ? " open" : ""}`} ref={box}>
      <button
        type="button"
        className={`fx-btn${open ? " open" : ""}`}
        aria-label={`País: ${current.name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Flag id={current.id} />
        <span className="fx-code">{current.currency}</span>
        <span className="fx-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open
        ? createPortal(
            <>
              <button type="button" className="fx-sheet-bg" aria-label="Fechar países" onClick={() => setOpen(false)} />
              <div className="fx-menu" role="listbox" aria-label="País e moeda" onPointerDown={(e) => e.stopPropagation()}>
                <div className="fx-menu-head">País e moeda · mín. {money(FLAG_MIN_BALANCE)}</div>
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
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
