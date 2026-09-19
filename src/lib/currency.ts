export type Country = {
  id: string;
  name: string;
  flag: string;
  currency: string;
  locale: string;
};

export const COUNTRIES: Country[] = [
  { id: "br", name: "Brasil", flag: "🇧🇷", currency: "BRL", locale: "pt-BR" },
  { id: "us", name: "Estados Unidos", flag: "🇺🇸", currency: "USD", locale: "en-US" },
  { id: "pt", name: "Portugal", flag: "🇵🇹", currency: "EUR", locale: "pt-PT" },
  { id: "es", name: "Espanha", flag: "🇪🇸", currency: "EUR", locale: "es-ES" },
  { id: "ar", name: "Argentina", flag: "🇦🇷", currency: "ARS", locale: "es-AR" },
  { id: "py", name: "Paraguai", flag: "🇵🇾", currency: "PYG", locale: "es-PY" },
  { id: "uy", name: "Uruguai", flag: "🇺🇾", currency: "UYU", locale: "es-UY" },
  { id: "cl", name: "Chile", flag: "🇨🇱", currency: "CLP", locale: "es-CL" },
  { id: "co", name: "Colômbia", flag: "🇨🇴", currency: "COP", locale: "es-CO" },
  { id: "mx", name: "México", flag: "🇲🇽", currency: "MXN", locale: "es-MX" },
  { id: "pe", name: "Peru", flag: "🇵🇪", currency: "PEN", locale: "es-PE" },
  { id: "gb", name: "Reino Unido", flag: "🇬🇧", currency: "GBP", locale: "en-GB" },
  { id: "ca", name: "Canadá", flag: "🇨🇦", currency: "CAD", locale: "en-CA" },
  { id: "jp", name: "Japão", flag: "🇯🇵", currency: "JPY", locale: "ja-JP" },
  { id: "de", name: "Alemanha", flag: "🇩🇪", currency: "EUR", locale: "de-DE" },
  { id: "fr", name: "França", flag: "🇫🇷", currency: "EUR", locale: "fr-FR" },
];

const KEY = "criptofy-country";

export const FALLBACK_RATES: Record<string, number> = {
  BRL: 1,
  USD: 0.185,
  EUR: 0.158,
  GBP: 0.138,
  ARS: 180,
  PYG: 1450,
  UYU: 7.4,
  CLP: 175,
  COP: 770,
  MXN: 3.55,
  PEN: 0.68,
  CAD: 0.25,
  JPY: 27.5,
  AUD: 0.28,
  CHF: 0.148,
};

export function countryById(id: string) {
  return COUNTRIES.find((c) => c.id === id) || COUNTRIES[0];
}

export function loadCountry() {
  try {
    const id = localStorage.getItem(KEY) || "br";
    return COUNTRIES.some((c) => c.id === id) ? id : "br";
  } catch {
    return "br";
  }
}

export function saveCountry(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

export function toLocal(amountBRL: number, currency: string, rates: Record<string, number>) {
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return amountBRL * rate;
}

export function formatMoney(amountBRL: number, countryId: string, rates: Record<string, number>) {
  const country = countryById(countryId);
  const value = toLocal(amountBRL, country.currency, rates);
  const digits = country.currency === "JPY" || country.currency === "PYG" || country.currency === "CLP" || country.currency === "COP" ? 0 : 2;
  return value.toLocaleString(country.locale, {
    style: "currency",
    currency: country.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch("https://open.er-api.com/v6/latest/BRL");
  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  if (data.result !== "success" || !data.rates) return FALLBACK_RATES;
  return { ...FALLBACK_RATES, ...data.rates, BRL: 1 };
}
