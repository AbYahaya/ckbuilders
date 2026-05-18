import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import { hexFromBytes, normalizeHex } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const FALLBACK_FEE_RATE = 1000n;
const AGREEMENT_DATA_LEN = 104;
const AGREEMENT_HASH_OFFSET = 0;
const AGREEMENT_VERSION_OFFSET = 32;

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

function buildAcceptanceData(agreementHash: Uint8Array, version: number): Uint8Array {
  const out = new Uint8Array(36);
  out.set(agreementHash, 0);
  writeU32LE(version, out, 32);
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

function parseAgreementData(data: string): { hash: Uint8Array; version: number } | null {
  if (!data.startsWith("0x")) {
    return null;
  }
  const bytes = ccc.bytesFrom(data);
  if (bytes.length !== AGREEMENT_DATA_LEN) {
    return null;
  }
  return {
    hash: bytes.slice(AGREEMENT_HASH_OFFSET, AGREEMENT_HASH_OFFSET + 32),
    version: readU32LE(bytes, AGREEMENT_VERSION_OFFSET),
  };
}

async function findAgreementCell(
  client: ccc.Client,
  typeScript: ccc.Script,
  version: number,
): Promise<{ cell: ccc.Cell; hash: Uint8Array; version: number }> {
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
      return { cell, hash: parsed.hash, version: parsed.version };
    }
  }

  throw new Error("No agreement version cell found for the provided version");
}

async function createBatchAcceptance(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  agreementCell: ccc.Cell,
  agreementHash: Uint8Array,
  version: number,
  count: number,
): Promise<string> {
  const sender = await signer.getRecommendedAddressObj();
  const tx = ccc.Transaction.from({});

  for (let i = 0; i < count; i += 1) {
    tx.addOutput(
      {
        capacity: config.acceptanceCapacityShannons,
        lock: sender.script,
        type: getAcceptanceTypeScript(),
      },
      ccc.hexFrom(buildAcceptanceData(agreementHash, version)),
    );
  }

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
  const typeScript = getAgreementTypeScript();
  const batchCount = Math.max(1, config.agreementBatchCount);

  console.log("Using RPC:", config.rpcUrl);
  console.log("Using Indexer:", config.indexerUrl);
  console.log("Agreement version type code hash:", config.agreementVersionTypeCodeHash);
  console.log("Agreement version type hash type:", config.agreementVersionTypeHashType);
  console.log("Agreement version dep out-point:", `${config.agreementVersionTypeTxHash}:${config.agreementVersionTypeTxIndex}`);
  console.log("Acceptance type code hash:", config.agreementAcceptanceTypeCodeHash);
  console.log("Acceptance type hash type:", config.agreementAcceptanceTypeHashType);
  console.log("Acceptance type dep out-point:", `${config.agreementAcceptanceTypeTxHash}:${config.agreementAcceptanceTypeTxIndex}`);
  console.log("Agreement version:", config.agreementVersion.toString());
  console.log("Batch count:", batchCount.toString());

  const agreement = await findAgreementCell(client, typeScript, config.agreementVersion);

  console.log("Agreement hash:", hexFromBytes(agreement.hash));

  const txHash = await createBatchAcceptance(
    client,
    signer,
    agreement.cell,
    agreement.hash,
    agreement.version,
    batchCount,
  );

  console.log("Batch acceptance tx sent:", txHash);
  await client.waitTransaction(txHash, 1, 120000, 3000);
  console.log("Batch acceptance committed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
