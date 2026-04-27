import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import { normalizeHex } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const FALLBACK_FEE_RATE = 1000n;

function buildDataRangeArgs(minBytes: number, maxBytes: number): string {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setUint32(0, minBytes, true);
  view.setUint32(4, maxBytes, true);
  return ccc.hexFrom(buf);
}

function buildHexData(size: number): string {
  return `0x${"11".repeat(size)}`;
}

function getTypeScript(): ccc.Script {
  return ccc.Script.from({
    codeHash: config.dataRangeTypeCodeHash,
    hashType: config.dataRangeTypeHashType as ccc.HashType,
    args: buildDataRangeArgs(config.dataRangeTypeMinBytes, config.dataRangeTypeMaxBytes),
  });
}

function getTypeDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: config.dataRangeTypeTxHash,
      index: config.dataRangeTypeTxIndex,
    },
    depType: "code",
  });
}

async function createTypedCell(
  signer: ccc.SignerCkbPrivateKey,
  typeScript: ccc.Script,
): Promise<string> {
  const sender = await signer.getRecommendedAddressObj();
  const tx = ccc.Transaction.from({});

  tx.addOutput(
    {
      capacity: config.dataRangeTypeCapacityShannons,
      lock: sender.script,
      type: typeScript,
    },
    buildHexData(config.dataRangeTypeInitialBytes),
  );

  tx.addCellDeps(getTypeDep());
  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function findFirstCellByType(client: ccc.Client, typeScript: ccc.Script): Promise<ccc.Cell> {
  for await (const cell of client.findCells({
    script: typeScript,
    scriptType: "type",
    scriptSearchMode: "exact",
    withData: true,
  })) {
    if (cell.outPoint && cell.cellOutput.capacity >= config.dataRangeTypeCapacityShannons) {
      return cell;
    }
  }

  throw new Error("No suitable live cells found for data-range type script");
}

async function updateTypedCell(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  typeScript: ccc.Script,
): Promise<string> {
  const cell = await findFirstCellByType(client, typeScript);
  const tx = ccc.Transaction.from({});

  tx.addInput({
    previousOutput: cell.outPoint,
    cellOutput: cell.cellOutput,
    outputData: cell.outputData,
  });

  tx.addOutput(
    {
      capacity: cell.cellOutput.capacity,
      lock: cell.cellOutput.lock,
      type: typeScript,
    },
    buildHexData(config.dataRangeTypeUpdatedBytes),
  );

  tx.addCellDeps(getTypeDep());
  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));
  const typeScript = getTypeScript();

  console.log("Using RPC:", config.rpcUrl);
  console.log("Using Indexer:", config.indexerUrl);
  console.log("Data-range type code hash:", config.dataRangeTypeCodeHash);
  console.log("Data-range type hash type:", config.dataRangeTypeHashType);
  console.log("Data-range type dep out-point:", `${config.dataRangeTypeTxHash}:${config.dataRangeTypeTxIndex}`);
  console.log("Data-range min bytes:", config.dataRangeTypeMinBytes.toString());
  console.log("Data-range max bytes:", config.dataRangeTypeMaxBytes.toString());
  console.log("Initial data bytes:", config.dataRangeTypeInitialBytes.toString());
  console.log("Updated data bytes:", config.dataRangeTypeUpdatedBytes.toString());

  const createTxHash = await createTypedCell(signer, typeScript);
  console.log("Create typed cell tx sent:", createTxHash);
  await client.waitTransaction(createTxHash, 1, 120000, 3000);
  console.log("Create tx committed.");

  const updateTxHash = await updateTypedCell(client, signer, typeScript);
  console.log("Update typed cell tx sent:", updateTxHash);
  await client.waitTransaction(updateTxHash, 1, 120000, 3000);
  console.log("Update tx committed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
