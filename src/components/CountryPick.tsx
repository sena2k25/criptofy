import { useEffect, useRef, useState } from "react";
import { COUNTRIES, countryById } from "../lib/currency";
import { FLAG_BONUS, useStore } from "../store";

function Flag({ id }: { id: string }) {
  const country = countryById(id);
  const [broken, setBroken] = useState(false);
  return (
    <span className="fx-flag">
      {broken ? (
        <span className="fx-flag-emoji" aria-hidden>
          {country.flag}
        </span>
      ) : (
        <img src={`https://flagcdn.com/w80/${id}.png`} alt="" onError={() => setBroken(true)} />
      )}
    </span>
  );
}

export function CountryPick() {
  const { country, setCountry, money } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = countryById(country);

  useEffect(() => {
    const hide = (e: Event) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", hide);
    return () => document.removeEventListener("pointerdown", hide);
  }, []);

  return (
    <div className={`fx-pick${open ? " open" : ""}`} ref={box}>
      <button
        type="button"
        className={`fx-btn${open ? " open" : ""}`}
        aria-label="Escolher país"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Flag id={current.id} />
        <span className="fx-code">{current.currency}</span>
        <span className="fx-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="fx-menu" role="listbox" aria-label="País e moeda">
          <div className="fx-menu-head">País e moeda · ganhe {money(FLAG_BONUS)}</div>
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
      ) : null}
    </div>
  );
}
