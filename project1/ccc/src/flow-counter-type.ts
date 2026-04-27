import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import { normalizeHex } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const FALLBACK_FEE_RATE = 1000n;

function u64ToLeHex(value: bigint): string {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, value, true);
  return ccc.hexFrom(buf);
}

function getCounterTypeScript(): ccc.Script {
  return ccc.Script.from({
    codeHash: config.counterTypeCodeHash,
    hashType: config.counterTypeHashType as ccc.HashType,
    args: "0x",
  });
}

function getCounterTypeDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: config.counterTypeTxHash,
      index: config.counterTypeTxIndex,
    },
    depType: "code",
  });
}

async function createCounterCell(
  signer: ccc.SignerCkbPrivateKey,
  typeScript: ccc.Script,
): Promise<string> {
  const sender = await signer.getRecommendedAddressObj();
  const tx = ccc.Transaction.from({});

  tx.addOutput(
    {
      capacity: config.counterTypeCapacityShannons,
      lock: sender.script,
      type: typeScript,
    },
    u64ToLeHex(0n),
  );

  tx.addCellDeps(getCounterTypeDep());
  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function findCounterCell(client: ccc.Client, typeScript: ccc.Script): Promise<ccc.Cell> {
  for await (const cell of client.findCells({
    script: typeScript,
    scriptType: "type",
    scriptSearchMode: "exact",
    withData: true,
  })) {
    if (cell.outPoint && cell.cellOutput.capacity >= config.counterTypeCapacityShannons) {
      return cell;
    }
  }

  throw new Error("No suitable counter cell found for update");
}

async function incrementCounterCell(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  typeScript: ccc.Script,
): Promise<string> {
  const cell = await findCounterCell(client, typeScript);
  const tx = ccc.Transaction.from({});

  tx.addInput({
    previousOutput: cell.outPoint,
    cellOutput: cell.cellOutput,
    outputData: cell.outputData,
  });

  const inputData = cell.outputData;
  const bytes = Uint8Array.from(Buffer.from(inputData.slice(2), "hex"));
  if (bytes.length < 8) {
    throw new Error("Invalid counter input data length");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const current = view.getBigUint64(0, true);
  const next = current + 1n;

  tx.addOutput(
    {
      capacity: cell.cellOutput.capacity,
      lock: cell.cellOutput.lock,
      type: typeScript,
    },
    u64ToLeHex(next),
  );

  tx.addCellDeps(getCounterTypeDep());
  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));
  const typeScript = getCounterTypeScript();

  console.log("Using RPC:", config.rpcUrl);
  console.log("Using Indexer:", config.indexerUrl);
  console.log("Counter type code hash:", config.counterTypeCodeHash);
  console.log("Counter type hash type:", config.counterTypeHashType);
  console.log("Counter type dep out-point:", `${config.counterTypeTxHash}:${config.counterTypeTxIndex}`);
  console.log("Counter capacity (shannons):", config.counterTypeCapacityShannons.toString());

  const createTx = await createCounterCell(signer, typeScript);
  console.log("Create counter cell tx sent:", createTx);
  await client.waitTransaction(createTx, 1, 120000, 3000);
  console.log("Create tx committed.");

  const incTx = await incrementCounterCell(client, signer, typeScript);
  console.log("Increment counter tx sent:", incTx);
  await client.waitTransaction(incTx, 1, 120000, 3000);
  console.log("Increment tx committed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
