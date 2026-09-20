export type PixCharge = {
  ok: true;
  id: string;
  amount: number;
  status: string;
  paid: boolean;
  pixCopiaCola: string;
  qrSrc: string;
  expiresAt: string | null;
};

type PixError = { ok: false; error: string };

async function parse(res: Response): Promise<PixCharge> {
  const text = await res.text();
  let data: PixCharge | PixError | null = null;
  try {
    data = text ? (JSON.parse(text) as PixCharge | PixError) : null;
  } catch {
    if (/cloudflare|origin web server|invalid or incomplete response/i.test(text) || res.status >= 520) {
      throw new Error("O servidor não aguentou esse valor. Tente um depósito menor.");
    }
    throw new Error("Falha ao gerar o Pix.");
  }
  if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
    const err = data && "error" in data ? data.error : `Falha HTTP ${res.status}.`;
    throw new Error(err);
  }
  return data;
}

export async function createPix(amount: number, description?: string): Promise<PixCharge> {
  const res = await fetch("/api/criptofy/pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: +amount.toFixed(2), description }),
  });
  return parse(res);
}

export async function checkPix(id: string): Promise<PixCharge> {
  const res = await fetch(`/api/criptofy/pix/${encodeURIComponent(id)}`);
  return parse(res);
}
