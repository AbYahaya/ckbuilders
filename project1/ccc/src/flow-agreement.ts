import * as ccc from "@ckb-ccc/core";
import { readFile } from "node:fs/promises";
import { utf8ToBytes } from "@noble/hashes/utils";
import { config } from "./config.js";
import { blake2b256, hexFromBytes, normalizeHex } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const FALLBACK_FEE_RATE = 1000n;
const AGREEMENT_DATA_LEN = 104;
const AGREEMENT_HASH_OFFSET = 0;
const AGREEMENT_VERSION_OFFSET = 32;
const AGREEMENT_URI_HASH_OFFSET = 36;
const AGREEMENT_PREV_HASH_OFFSET = 68;
const AGREEMENT_PREV_INDEX_OFFSET = 100;

function requireValue(value: string, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function writeU32LE(value: number, target: Uint8Array, offset: number): void {
  const view = new DataView(target.buffer, target.byteOffset, target.byteLength);
  view.setUint32(offset, value, true);
}

function readU32LE(source: Uint8Array, offset: number): number {
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  return view.getUint32(offset, true);
}

function parseHexBytes(value: string, length: number, name: string): Uint8Array {
  if (!value) {
    return new Uint8Array(length);
  }
  const normalized = value.startsWith("0x") ? value : `0x${value}`;
  const bytes = ccc.bytesFrom(normalized);
  if (bytes.length !== length) {
    throw new Error(`Invalid ${name} length: expected ${length} bytes`);
  }
  return bytes;
}

function parseU32Hex(value: string, name: string): number {
  if (!value) {
    return 0;
  }
  const normalized = value.startsWith("0x") ? value : `0x${value}`;
  const parsed = Number.parseInt(normalized, 16);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 0xffffffff) {
    throw new Error(`Invalid ${name} (must be u32)`);
  }
  return parsed;
}

function isZeroBytes(bytes: Uint8Array): boolean {
  return bytes.every((byte) => byte === 0);
}

async function readAgreementText(): Promise<Uint8Array> {
  const buf = await readFile(config.agreementTextPath);
  return new Uint8Array(buf);
}

function buildAgreementData(
  agreementHash: Uint8Array,
  version: number,
  uriHash: Uint8Array,
  prevTxHash: Uint8Array,
  prevIndex: number,
): Uint8Array {
  const out = new Uint8Array(AGREEMENT_DATA_LEN);
  out.set(agreementHash, AGREEMENT_HASH_OFFSET);
  writeU32LE(version, out, AGREEMENT_VERSION_OFFSET);
  out.set(uriHash, AGREEMENT_URI_HASH_OFFSET);
  out.set(prevTxHash, AGREEMENT_PREV_HASH_OFFSET);
  writeU32LE(prevIndex, out, AGREEMENT_PREV_INDEX_OFFSET);
  return out;
}

function parseMetadataValue(value: string): Uint8Array {
  if (!value) {
    return new Uint8Array();
  }
  if (value.startsWith("0x")) {
    return ccc.bytesFrom(value);
  }
  return utf8ToBytes(value);
}

function buildAcceptanceData(
  agreementHash: Uint8Array,
  version: number,
  metadata: Uint8Array,
): Uint8Array {
  const out = new Uint8Array(36 + metadata.length);
  out.set(agreementHash, 0);
  writeU32LE(version, out, 32);
  out.set(metadata, 36);
  return out;
}

function getAgreementTypeScript(): ccc.Script {
  return ccc.Script.from({
    codeHash: requireValue(config.agreementVersionTypeCodeHash, "AGREEMENT_VERSION_TYPE_CODE_HASH"),
    hashType: requireValue(config.agreementVersionTypeHashType, "AGREEMENT_VERSION_TYPE_HASH_TYPE") as ccc.HashType,
    args: "0x",
  });
}

function getAcceptanceTypeScript(): ccc.Script {
  return ccc.Script.from({
    codeHash: requireValue(config.agreementAcceptanceTypeCodeHash, "AGREEMENT_ACCEPTANCE_TYPE_CODE_HASH"),
    hashType: requireValue(config.agreementAcceptanceTypeHashType, "AGREEMENT_ACCEPTANCE_TYPE_HASH_TYPE") as ccc.HashType,
    args: "0x",
  });
}

function getAgreementTypeDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: requireValue(config.agreementVersionTypeTxHash, "AGREEMENT_VERSION_TYPE_TX_HASH"),
      index: requireValue(config.agreementVersionTypeTxIndex, "AGREEMENT_VERSION_TYPE_TX_INDEX"),
    },
    depType: "code",
  });
}

function getAcceptanceTypeDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: requireValue(config.agreementAcceptanceTypeTxHash, "AGREEMENT_ACCEPTANCE_TYPE_TX_HASH"),
      index: requireValue(config.agreementAcceptanceTypeTxIndex, "AGREEMENT_ACCEPTANCE_TYPE_TX_INDEX"),
    },
    depType: "code",
  });
}

async function createAgreementVersion(
  signer: ccc.SignerCkbPrivateKey,
  agreementData: Uint8Array,
): Promise<string> {
  const sender = await signer.getRecommendedAddressObj();
  const tx = ccc.Transaction.from({});

  tx.addOutput(
    {
      capacity: config.agreementCapacityShannons,
      lock: sender.script,
      type: getAgreementTypeScript(),
    },
    ccc.hexFrom(agreementData),
  );

  tx.addCellDeps(getAgreementTypeDep());
  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

function parseAgreementData(data: string): { hash: string; version: number } | null {
  if (!data.startsWith("0x")) {
    return null;
  }
  const bytes = ccc.bytesFrom(data);
  if (bytes.length !== AGREEMENT_DATA_LEN) {
    return null;
  }
  const version = readU32LE(bytes, AGREEMENT_VERSION_OFFSET);
  return {
    hash: hexFromBytes(bytes.slice(AGREEMENT_HASH_OFFSET, AGREEMENT_HASH_OFFSET + 32)),
    version,
  };
}

async function findAgreementCell(
  client: ccc.Client,
  typeScript: ccc.Script,
  agreementHashHex: string,
  version: number,
): Promise<ccc.Cell> {
  for await (const cell of client.findCells({
    script: typeScript,
    scriptType: "type",
    scriptSearchMode: "exact",
    withData: true,
  })) {
    if (!cell.outPoint || !cell.outputData) {
      continue;
    }
    const parsed = parseAgreementData(cell.outputData);
    if (!parsed) {
      continue;
    }
    if (parsed.hash === agreementHashHex && parsed.version === version) {
      return cell;
    }
  }

  throw new Error("No agreement version cell found for the provided hash/version");
}

async function findAgreementCellByVersion(
  client: ccc.Client,
  typeScript: ccc.Script,
  version: number,
): Promise<ccc.Cell> {
  for await (const cell of client.findCells({
    script: typeScript,
    scriptType: "type",
    scriptSearchMode: "exact",
    withData: true,
  })) {
    if (!cell.outPoint || !cell.outputData) {
      continue;
    }
    const parsed = parseAgreementData(cell.outputData);
    if (!parsed) {
      continue;
    }
    if (parsed.version === version) {
      return cell;
    }
  }

  throw new Error("No agreement version cell found for the provided version");
}

async function createAcceptance(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  agreementCell: ccc.Cell,
  acceptanceData: Uint8Array,
): Promise<string> {
  const sender = await signer.getRecommendedAddressObj();
  const tx = ccc.Transaction.from({});

  tx.addOutput(
    {
      capacity: config.acceptanceCapacityShannons,
      lock: sender.script,
      type: getAcceptanceTypeScript(),
    },
    ccc.hexFrom(acceptanceData),
  );

  tx.addCellDeps(getAcceptanceTypeDep());
  if (!agreementCell.outPoint) {
    throw new Error("Agreement cell is missing outPoint");
  }
  tx.addCellDeps(
    ccc.CellDep.from({
      outPoint: agreementCell.outPoint,
      depType: "code",
    }),
  );

  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));

  const agreementText = await readAgreementText();
  const agreementHash = blake2b256(agreementText);
  const uriHash = blake2b256(utf8ToBytes(config.agreementUri));
  let prevTxHash = parseHexBytes(config.agreementPrevTxHash, 32, "AGREEMENT_PREV_TX_HASH");
  let prevIndex = parseU32Hex(config.agreementPrevTxIndex, "AGREEMENT_PREV_TX_INDEX");
  if (config.agreementVersion > 1 && isZeroBytes(prevTxHash) && prevIndex === 0) {
    const prevCell = await findAgreementCellByVersion(
      client,
      getAgreementTypeScript(),
      config.agreementVersion - 1,
    );
    if (!prevCell.outPoint) {
      throw new Error("Previous agreement cell is missing outPoint");
    }
    prevTxHash = ccc.bytesFrom(prevCell.outPoint.txHash);
    prevIndex = parseU32Hex(prevCell.outPoint.index, "AGREEMENT_PREV_TX_INDEX");
    console.log(
      "Resolved prev out-point from version",
      config.agreementVersion - 1,
      `${prevCell.outPoint.txHash}:${prevCell.outPoint.index}`,
    );
  }
  const agreementData = buildAgreementData(
    agreementHash,
    config.agreementVersion,
    uriHash,
    prevTxHash,
    prevIndex,
  );
  const acceptanceMetadata = parseMetadataValue(config.agreementAcceptanceMetadata[0] ?? "");
  const acceptanceData = buildAcceptanceData(
    agreementHash,
    config.agreementVersion,
    acceptanceMetadata,
  );

  console.log("Using RPC:", config.rpcUrl);
  console.log("Using Indexer:", config.indexerUrl);
  console.log("Agreement version type code hash:", config.agreementVersionTypeCodeHash);
  console.log("Agreement version type hash type:", config.agreementVersionTypeHashType);
  console.log("Agreement version dep out-point:", `${config.agreementVersionTypeTxHash}:${config.agreementVersionTypeTxIndex}`);
  console.log("Acceptance type code hash:", config.agreementAcceptanceTypeCodeHash);
  console.log("Acceptance type hash type:", config.agreementAcceptanceTypeHashType);
  console.log("Acceptance type dep out-point:", `${config.agreementAcceptanceTypeTxHash}:${config.agreementAcceptanceTypeTxIndex}`);
  console.log("Agreement text path:", config.agreementTextPath);
  console.log("Agreement URI:", config.agreementUri);
  console.log("Agreement version:", config.agreementVersion.toString());
  console.log("Agreement prev tx hash:", hexFromBytes(prevTxHash));
  console.log("Agreement prev tx index:", `0x${prevIndex.toString(16)}`);
  console.log("Agreement hash:", hexFromBytes(agreementHash));
  console.log(
    "Acceptance metadata:",
    acceptanceMetadata.length > 0 ? ccc.hexFrom(acceptanceMetadata) : "none",
  );

  const agreementTxHash = await createAgreementVersion(signer, agreementData);
  console.log("Publish agreement tx sent:", agreementTxHash);
  await client.waitTransaction(agreementTxHash, 1, 120000, 3000);
  console.log("Agreement version committed.");

  const agreementCell = await findAgreementCell(
    client,
    getAgreementTypeScript(),
    hexFromBytes(agreementHash),
    config.agreementVersion,
  );

  const acceptanceTxHash = await createAcceptance(client, signer, agreementCell, acceptanceData);
  console.log("Acceptance tx sent:", acceptanceTxHash);
  await client.waitTransaction(acceptanceTxHash, 1, 120000, 3000);
  console.log("Acceptance committed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
