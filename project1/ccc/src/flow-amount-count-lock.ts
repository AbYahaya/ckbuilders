import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import { normalizeHex } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const FALLBACK_FEE_RATE = 1000n;

function buildAmountCountArgs(amount: bigint, count: bigint): string {
  const buf = new Uint8Array(16);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, amount, true);
  view.setBigUint64(8, count, true);
  return ccc.hexFrom(buf);
}

function getAmountCountLockScript(): ccc.Script {
  const args = buildAmountCountArgs(
    config.amountCountLockAmountShannons,
    BigInt(config.amountCountLockRequiredCount),
  );

  return ccc.Script.from({
    codeHash: config.amountCountLockCodeHash,
    hashType: config.amountCountLockHashType as ccc.HashType,
    args,
  });
}

function getAmountCountLockDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: config.amountCountLockTxHash,
      index: config.amountCountLockTxIndex,
    },
    depType: "code",
  });
}

async function createLockedCells(
  signer: ccc.SignerCkbPrivateKey,
  customLock: ccc.Script,
): Promise<string> {
  const tx = ccc.Transaction.from({});

  for (let i = 0; i < config.amountCountLockCreateOutputs; i += 1) {
    tx.addOutput(
      {
        capacity: config.amountCountLockAmountShannons,
        lock: customLock,
      },
      "0x",
    );
  }

  tx.addCellDeps(getAmountCountLockDep());
  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function findFirstCellByLock(client: ccc.Client, lock: ccc.Script): Promise<ccc.Cell> {
  for await (const cell of client.findCells({
    script: lock,
    scriptType: "lock",
    scriptSearchMode: "exact",
    withData: true,
  })) {
    if (cell.outPoint) {
      return cell;
    }
  }

  throw new Error("No live cells found for amount-count lock");
}

async function unlockLockedCell(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  customLock: ccc.Script,
): Promise<string> {
  const lockedCell = await findFirstCellByLock(client, customLock);
  const receiver = await ccc.Address.fromString(config.receiverAddress, client);

  const tx = ccc.Transaction.from({});
  tx.addInput({
    previousOutput: lockedCell.outPoint,
    cellOutput: lockedCell.cellOutput,
    outputData: lockedCell.outputData,
  });

  for (let i = 0; i < config.amountCountLockRequiredCount; i += 1) {
    tx.addOutput(
      {
        capacity: config.amountCountLockAmountShannons,
        lock: receiver.script,
      },
      "0x",
    );
  }

  tx.addCellDeps(getAmountCountLockDep());

  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));
  const lock = getAmountCountLockScript();

  console.log("Using RPC:", config.rpcUrl);
  console.log("Using Indexer:", config.indexerUrl);
  console.log("Amount-count lock code hash:", config.amountCountLockCodeHash);
  console.log("Amount-count lock hash type:", config.amountCountLockHashType);
  console.log("Amount-count lock dep out-point:", `${config.amountCountLockTxHash}:${config.amountCountLockTxIndex}`);
  console.log("Args amount (shannons):", config.amountCountLockAmountShannons.toString());
  console.log("Args required count:", config.amountCountLockRequiredCount.toString());
  console.log("Create outputs:", config.amountCountLockCreateOutputs.toString());

  const createTx = await createLockedCells(signer, lock);
  console.log("Create amount-count locked cells tx sent:", createTx);
  await client.waitTransaction(createTx, 1, 120000, 3000);
  console.log("Create tx committed.");

  const unlockTx = await unlockLockedCell(client, signer, lock);
  console.log("Unlock amount-count lock tx sent:", unlockTx);
  await client.waitTransaction(unlockTx, 1, 120000, 3000);
  console.log("Unlock tx committed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
