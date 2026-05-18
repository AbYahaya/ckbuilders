import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PORT = 5179;
const AGREEMENT_TEXT_PATH = process.env.AGREEMENT_TEXT_PATH ?? resolve(__dirname, "../../files/Agreement-v1.txt");
const AGREEMENT_TX_HASH = process.env.AGREEMENT_TX_HASH ?? "";
const ACCEPTANCE_TX_HASH = process.env.ACCEPTANCE_TX_HASH ?? "";
const AGREEMENT_VERSION = process.env.AGREEMENT_VERSION ?? "1";
const AGREEMENT_URI = process.env.AGREEMENT_URI ?? "";

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function displayOrFallback(value, fallback = "not set") {
  return value && value.length > 0 ? value : fallback;
}

async function buildPage() {
  const text = await readFile(AGREEMENT_TEXT_PATH, "utf8");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agreement Viewer</title>
  <style>
    body { font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif; margin: 40px; color: #1f2a30; background: #f7f3ee; }
    main { max-width: 880px; margin: 0 auto; background: #fffdf9; padding: 32px; border: 1px solid #e7dfd4; box-shadow: 0 12px 30px rgba(31, 42, 48, 0.1); }
    h1 { margin-top: 0; letter-spacing: 0.02em; }
    .meta { margin: 16px 0 24px; padding: 16px; background: #f2e9dd; border: 1px solid #e1d6c6; }
    .meta dt { font-weight: 600; margin-top: 8px; }
    .meta dd { margin: 4px 0 0 0; }
    pre { background: #f8f6f1; padding: 18px; white-space: pre-wrap; border: 1px solid #ece3d7; }
    a { color: #2b6a7e; }
  </style>
</head>
<body>
  <main>
    <h1>Agreement Version ${escapeHtml(AGREEMENT_VERSION)}</h1>
    <div class="meta">
      <dl>
        <dt>Agreement URI</dt>
        <dd>${escapeHtml(displayOrFallback(AGREEMENT_URI))}</dd>
        <dt>Agreement Tx Hash</dt>
        <dd>${escapeHtml(displayOrFallback(AGREEMENT_TX_HASH))}</dd>
        <dt>Acceptance Tx Hash</dt>
        <dd>${escapeHtml(displayOrFallback(ACCEPTANCE_TX_HASH))}</dd>
      </dl>
    </div>
    <pre>${escapeHtml(text)}</pre>
  </main>
</body>
</html>`;
}

const server = http.createServer(async (_req, res) => {
  try {
    const page = await buildPage();
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(page);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
});

server.listen(DEFAULT_PORT, () => {
  console.log(`Agreement viewer running at http://127.0.0.1:${DEFAULT_PORT}`);
});
