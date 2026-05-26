import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PORT = 5179;
const AGREEMENT_VERSIONS_PATH = process.env.AGREEMENT_VERSIONS_PATH ?? resolve(__dirname, "../../files/agreements.json");
const AGREEMENT_TEXT_PATH = process.env.AGREEMENT_TEXT_PATH ?? resolve(__dirname, "../../files/Agreement-v1.txt");
const AGREEMENT_TX_HASH = process.env.AGREEMENT_TX_HASH ?? "";
const ACCEPTANCE_TX_HASH = process.env.ACCEPTANCE_TX_HASH ?? "";
const AGREEMENT_VERSION = process.env.AGREEMENT_VERSION ?? "1";
const AGREEMENT_URI = process.env.AGREEMENT_URI ?? "";
const CKB_TX_EXPLORER_BASE = process.env.CKB_TX_EXPLORER_BASE ?? "";

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

function normalizeExplorerBase(value) {
  if (!value) {
    return "";
  }
  return value.endsWith("/") ? value : `${value}/`;
}

function buildTxUrl(txHash) {
  if (!txHash) {
    return "";
  }
  const base = normalizeExplorerBase(CKB_TX_EXPLORER_BASE);
  if (!base) {
    return "";
  }
  return `${base}${txHash}`;
}

function formatTxValue(txHash) {
  const url = buildTxUrl(txHash);
  if (!txHash) {
    return escapeHtml(displayOrFallback(txHash));
  }
  if (!url) {
    return escapeHtml(txHash);
  }
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(txHash)}</a>`;
}

function resolveTextPath(baseDir, textPath) {
  if (!textPath) {
    return AGREEMENT_TEXT_PATH;
  }
  if (textPath.startsWith("/") || textPath.includes(":\\")) {
    return textPath;
  }
  return resolve(baseDir, textPath);
}

async function loadVersions() {
  try {
    const raw = await readFile(AGREEMENT_VERSIONS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Agreement versions JSON must be an array");
    }
    const baseDir = dirname(AGREEMENT_VERSIONS_PATH);
    return parsed
      .map((entry) => ({
        version: Number(entry.version),
        textPath: resolveTextPath(baseDir, entry.textPath ?? ""),
        uri: entry.uri ?? "",
        agreementTxHash: entry.agreementTxHash ?? "",
        acceptanceTxHash: entry.acceptanceTxHash ?? "",
      }))
      .filter((entry) => Number.isFinite(entry.version));
  } catch (_err) {
    return [
      {
        version: Number(AGREEMENT_VERSION),
        textPath: AGREEMENT_TEXT_PATH,
        uri: AGREEMENT_URI,
        agreementTxHash: AGREEMENT_TX_HASH,
        acceptanceTxHash: ACCEPTANCE_TX_HASH,
      },
    ];
  }
}

function pickVersion(versions, requestedVersion) {
  if (!versions.length) {
    return null;
  }
  if (requestedVersion) {
    const parsed = Number(requestedVersion);
    const match = versions.find((entry) => entry.version === parsed);
    if (match) {
      return match;
    }
  }
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  return sorted[0];
}

async function buildPage(versions, selectedVersion) {
  const entry = pickVersion(versions, selectedVersion);
  if (!entry) {
    throw new Error("No agreement versions available");
  }
  const text = await readFile(entry.textPath, "utf8");
  const options = versions
    .slice()
    .sort((a, b) => b.version - a.version)
    .map((item) => {
      const selected = item.version === entry.version ? " selected" : "";
      return `<option value="${item.version}"${selected}>Version ${item.version}</option>`;
    })
    .join("");
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
    label { display: block; font-weight: 600; margin-bottom: 6px; }
    select { padding: 6px 10px; border: 1px solid #d8cdbf; background: #fff; margin-bottom: 16px; }
    pre { background: #f8f6f1; padding: 18px; white-space: pre-wrap; border: 1px solid #ece3d7; }
    a { color: #2b6a7e; }
  </style>
</head>
<body>
  <main>
    <h1>Agreement Version ${escapeHtml(String(entry.version))}</h1>
    <label for="versionSelect">Select version</label>
    <select id="versionSelect">
      ${options}
    </select>
    <div class="meta">
      <dl>
        <dt>Agreement URI</dt>
        <dd>${escapeHtml(displayOrFallback(entry.uri))}</dd>
        <dt>Agreement Tx Hash</dt>
        <dd>${formatTxValue(entry.agreementTxHash)}</dd>
        <dt>Acceptance Tx Hash</dt>
        <dd>${formatTxValue(entry.acceptanceTxHash)}</dd>
      </dl>
    </div>
    <pre>${escapeHtml(text)}</pre>
  </main>
  <script>
    const select = document.getElementById("versionSelect");
    select.addEventListener("change", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("version", select.value);
      window.location.href = url.toString();
    });
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const versions = await loadVersions();
    const requestUrl = new URL(req.url ?? "/", `http://127.0.0.1:${DEFAULT_PORT}`);
    const page = await buildPage(versions, requestUrl.searchParams.get("version"));
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
