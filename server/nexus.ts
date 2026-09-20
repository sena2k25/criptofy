import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import { envGet } from "./env";

const PAID = new Set([
  "paid",
  "pago",
  "approved",
  "aprovado",
  "confirmed",
  "confirmado",
  "completed",
  "concluido",
  "succeeded",
  "success",
  "payment.confirmed",
]);

type NexusCfg = {
  apiKey: string;
  baseUrl: string;
  webhookUrl: string;
};

function cfg(root: string, _mode: string): NexusCfg {
  return {
    apiKey: envGet(root, "NEXUSPAG_API_KEY"),
    baseUrl: envGet(root, "NEXUSPAG_BASE_URL", "https://nexuspag.com").replace(/\/$/, ""),
    webhookUrl: envGet(root, "NEXUSPAG_WEBHOOK_URL"),
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function walkStrings(value: unknown, out: string[]) {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) walkStrings(item, out);
  }
}

function walkFind(value: unknown, keys: string[]): string | null {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const queue: unknown[] = [value];
  while (queue.length) {
    const cur = queue.shift();
    if (!cur || typeof cur !== "object") continue;
    if (Array.isArray(cur)) {
      queue.push(...cur);
      continue;
    }
    for (const [key, item] of Object.entries(cur)) {
      if (wanted.has(key.toLowerCase()) && (typeof item === "string" || typeof item === "number")) {
        const text = String(item).trim();
        if (text) return text;
      }
    }
    for (const item of Object.values(cur)) {
      if (item && typeof item === "object") queue.push(item);
    }
  }
  return null;
}

function extractCopiaCola(data: unknown): string | null {
  const named = walkFind(data, [
    "pix_copia_cola",
    "pix_copia_e_cola",
    "copia_e_cola",
    "copiaecola",
    "brcode",
    "br_code",
    "emv",
    "payload",
    "pix_code",
  ]);
  if (named && named.startsWith("00020")) return named;
  const strings: string[] = [];
  walkStrings(data, strings);
  for (const text of strings) {
    const t = text.trim();
    if (t.startsWith("00020") && t.length > 50) return t;
  }
  return named;
}

function extractQr(data: unknown): string {
  const strings: string[] = [];
  walkStrings(data, strings);
  for (const raw of strings) {
    const text = raw.trim();
    if (text.startsWith("data:image") && text.length < 80_000) return text;
    if (text.length < 80_000 && (text.startsWith("iVBORw0KGgo") || text.startsWith("/9j/"))) {
      return `data:image/png;base64,${text}`;
    }
    if (/^https?:\/\//i.test(text) && /(qrcode|qr_code|qr-code|\.png|\.jpg|\.jpeg|\.svg)/i.test(text)) {
      return text;
    }
  }
  return "";
}

function qrFromCopia(copia: string) {
  if (!copia) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(copia)}`;
}

function extractId(data: unknown): string | null {
  return walkFind(data, ["id", "uuid", "transaction_id", "transactionId", "txid", "pix_id", "charge_id"]);
}

function extractStatus(data: unknown): string {
  return (walkFind(data, ["status", "payment_status", "state", "situacao"]) || "").toLowerCase();
}

function extractAmount(data: unknown): number {
  const raw = walkFind(data, ["amount", "valor"]);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function extractError(data: unknown, fallback: string): string {
  return walkFind(data, ["message", "error", "erro", "detail"]) || fallback;
}

function isPaid(status: string): boolean {
  return PAID.has(status.trim().toLowerCase());
}

function publicCharge(data: unknown, fallbackAmount?: number) {
  const status = extractStatus(data);
  const amount = extractAmount(data) || fallbackAmount || 0;
  const pixCopiaCola = extractCopiaCola(data) || "";
  return {
    ok: true,
    id: extractId(data) || "",
    amount,
    status: status || "pending",
    paid: isPaid(status),
    pixCopiaCola,
    qrSrc: extractQr(data) || qrFromCopia(pixCopiaCola),
    expiresAt: walkFind(data, ["expires_at", "expiresAt", "expiration"]),
  };
}

const NEXUS_TIMEOUT_MS = 12_000;
const PIX_MAX_AMOUNT = 50_000;

async function nexus(cfgNow: NexusCfg, method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    "x-api-key": cfgNow.apiKey,
    Accept: "application/json",
  };
  const init: RequestInit = { method, headers, signal: AbortSignal.timeout(NEXUS_TIMEOUT_MS) };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${cfgNow.baseUrl}${path}`, init);
  const raw = await res.text();
  let data: unknown = {};
  if (raw.length > 1_500_000) {
    const copia = raw.match(/00020[0-9A-Za-z.+\-/*=$%]+/);
    data = copia ? { pix_copia_cola: copia[0] } : {};
  } else {
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
  }
  return { ok: res.ok, http: res.status, data, raw };
}

export async function handlePix(
  req: IncomingMessage,
  res: ServerResponse,
  root: string,
  mode: string,
): Promise<boolean> {
  const url = (req.url || "").split("?")[0];
  if (!url.startsWith("/api/criptofy/pix")) return false;
  const ready = cfg(root, mode);

  try {
    if (req.method === "POST" && url === "/api/criptofy/pix") {
      if (!ready.apiKey) {
        send(res, 503, { ok: false, error: "Falta NEXUSPAG_API_KEY no arquivo .env." });
        return true;
      }
      const parsed = JSON.parse((await readBody(req)) || "{}") as { amount?: number; description?: string };
      const amount = Number(parsed.amount);
      if (!Number.isFinite(amount) || amount < 1) {
        send(res, 400, { ok: false, error: "Valor mínimo: R$ 1,00." });
        return true;
      }
      if (amount > PIX_MAX_AMOUNT) {
        send(res, 400, { ok: false, error: `Valor máximo do Pix: R$ ${PIX_MAX_AMOUNT.toLocaleString("pt-BR")}.` });
        return true;
      }
      const externalId = `criptofy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: Record<string, unknown> = {
        amount: +amount.toFixed(2),
        description: parsed.description || `Depósito CRIPTOFY ${externalId}`,
        external_id: externalId,
        expiration: 1800,
      };
      if (ready.webhookUrl) payload.webhook_url = ready.webhookUrl;

      const result = await nexus(ready, "POST", "/api/pix/create", payload);
      if (!result.ok) {
        const http = result.http >= 400 && result.http <= 499 ? result.http : 502;
        send(res, http, {
          ok: false,
          error: extractError(result.data, "A NexusPag não gerou o Pix."),
        });
        return true;
      }
      const charge = publicCharge(result.data, amount);
      if (!charge.pixCopiaCola) {
        send(res, 502, { ok: false, error: "A NexusPag respondeu sem o código Pix." });
        return true;
      }
      send(res, 201, charge);
      return true;
    }

    if (req.method === "GET" && url.startsWith("/api/criptofy/pix/")) {
      if (!ready.apiKey) {
        send(res, 503, { ok: false, error: "Falta NEXUSPAG_API_KEY no arquivo .env." });
        return true;
      }
      const id = decodeURIComponent(url.slice("/api/criptofy/pix/".length));
      if (!id) {
        send(res, 400, { ok: false, error: "Informe o id da cobrança." });
        return true;
      }
      const result = await nexus(ready, "GET", `/api/pix/${encodeURIComponent(id)}`);
      if (!result.ok) {
        const http = result.http >= 400 && result.http <= 499 ? result.http : 502;
        send(res, http, {
          ok: false,
          error: extractError(result.data, "Não foi possível consultar o Pix."),
        });
        return true;
      }
      send(res, 200, publicCharge(result.data));
      return true;
    }

    send(res, 404, { ok: false, error: "Rota não encontrada." });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    const message = timedOut
      ? "A NexusPag demorou demais nesse valor. Tente um valor menor."
      : err instanceof Error
        ? err.message
        : "Erro interno.";
    send(res, timedOut ? 504 : 500, { ok: false, error: message });
  }
  return true;
}

function attach(server: ViteDevServer) {
  server.middlewares.use(async (req, res, next) => {
    if (await handlePix(req, res, server.config.root, server.config.mode)) return;
    next();
  });
}

export function nexusPixPlugin(): Plugin {
  return {
    name: "criptofy-nexus-pix",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
