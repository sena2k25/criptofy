import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { handleCrypto } from "./crypto";
import { handlePix } from "./nexus";

const root = process.cwd();
const dist = resolve(root, "dist");
const port = Number(process.env.PORT || 5273);
const mode = process.env.NODE_ENV === "development" ? "development" : "production";

const MIME: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function safeFile(urlPath: string) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const full = normalize(join(dist, clean || "index.html"));
  if (!full.startsWith(dist)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  try {
    if (await handlePix(req, res, root, mode)) return;
    if (await handleCrypto(req, res)) return;
    let file = safeFile(req.url || "/");
    if (!file) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }
    if (!existsSync(file) || (await stat(file)).isDirectory()) file = join(dist, "index.html");
    if (!existsSync(file)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[extname(file).toLowerCase()] || "application/octet-stream");
    createReadStream(file).pipe(res);
  } catch (err) {
    res.statusCode = 500;
    res.end(err instanceof Error ? err.message : "Erro interno.");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CRIPTOFY no ar em http://0.0.0.0:${port}`);
});
