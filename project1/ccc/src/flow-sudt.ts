import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import { hexFromBytes, normalizeHex } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const SHANNONS_PER_CKB = 100000000n;
const FALLBACK_FEE_RATE = 1000n;
const TOKEN_CELL_CAPACITY = 142n * SHANNONS_PER_CKB;

function ckbytesToShannons(ckbytes: bigint): bigint {
  return ckbytes * SHANNONS_PER_CKB;
}

function u128ToLeHex(value: bigint): string {
  if (value < 0n) throw new Error("Token amount must be non-negative");
  const bytes = new Uint8Array(16);
  let v = value;
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error("Token amount exceeds u128 range");
  return hexFromBytes(bytes);
}

function getSudtCellDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: config.sudtDepTxHash,
      index: config.sudtDepIndex,
    },
    depType: config.sudtDepType as ccc.DepType,
  });
}

async function buildSudtTypeScript(ownerLock: ccc.Script): Promise<ccc.Script> {
  return ccc.Script.from({
    codeHash: config.sudtCodeHash,
    hashType: config.sudtHashType as ccc.HashType,
    args: ownerLock.hash(),
  });
}

async function issueTokens(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  owner: ccc.Address,
  receiver1: ccc.Address,
  sudtType: ccc.Script,
): Promise<string> {
  const tx = ccc.Transaction.from({});
  tx.addCellDeps(getSudtCellDep());

  const ownerAmounts = [100n, 300n, 700n];
  for (const amount of ownerAmounts) {
    tx.addOutput(
      {
        capacity: TOKEN_CELL_CAPACITY,
        lock: owner.script,
        type: sudtType,
      },
      u128ToLeHex(amount),
    );
  }

  tx.addOutput(
    {
      capacity: TOKEN_CELL_CAPACITY,
      lock: receiver1.script,
      type: sudtType,
    },
    u128ToLeHex(900n),
  );

  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  const txHash = await signer.sendTransaction(tx);
  console.log("SUDT issue tx sent:", txHash);
  await client.waitTransaction(txHash, 1, 120000, 3000);
  console.log("SUDT issue tx committed.");
  return txHash;
}

async function collectOwnerSudtCells(
  client: ccc.Client,
  owner: ccc.Address,
  sudtType: ccc.Script,
): Promise<ccc.Cell[]> {
  const cells: ccc.Cell[] = [];
  for await (const cell of client.findCells({
    script: sudtType,
    scriptType: "type",
    scriptSearchMode: "exact",
    withData: true,
  })) {
    const lock = ccc.Script.from(cell.cellOutput.lock);
    if (lock.eq(owner.script)) {
      cells.push(cell);
    }
  }
  return cells;
}

function sumSudt(cells: ccc.Cell[]): bigint {
  return cells.reduce((sum, cell) => {
    if (!cell.outputData || cell.outputData === "0x") {
      return sum;
    }
    const data = ccc.bytesFrom(cell.outputData);
    let value = 0n;
    for (let i = 15; i >= 0; i -= 1) {
      value = (value << 8n) + BigInt(data[i]);
    }
    return sum + value;
  }, 0n);
}

async function transferTokens(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  owner: ccc.Address,
  receiver1: ccc.Address,
  receiver2: ccc.Address,
  sudtType: ccc.Script,
): Promise<string> {
  const allOwnerCells = await collectOwnerSudtCells(client, owner, sudtType);
  if (allOwnerCells.length === 0) {
    throw new Error("No SUDT cells found for owner");
  }

  const transfer1 = 200n;
  const transfer2 = 400n;
  const transferTotal = transfer1 + transfer2;

  let selected: ccc.Cell[] = [];
  let selectedTokens = 0n;
  for (const cell of allOwnerCells) {
    selected.push(cell);
    selectedTokens = sumSudt(selected);
    if (selectedTokens >= transferTotal) {
      break;
    }
  }

  if (selectedTokens < transferTotal) {
    throw new Error("Not enough SUDT balance for transfer");
  }

  const tx = ccc.Transaction.from({});
  tx.addCellDeps(getSudtCellDep());

  for (const cell of selected) {
    if (!cell.outPoint) continue;
    tx.addInput({
      previousOutput: cell.outPoint,
      cellOutput: cell.cellOutput,
      outputData: cell.outputData,
    });
  }

  tx.addOutput(
    {
      capacity: TOKEN_CELL_CAPACITY,
      lock: receiver1.script,
      type: sudtType,
    },
    u128ToLeHex(transfer1),
  );

  tx.addOutput(
    {
      capacity: TOKEN_CELL_CAPACITY,
      lock: receiver2.script,
      type: sudtType,
    },
    u128ToLeHex(transfer2),
  );

  const changeTokens = selectedTokens - transferTotal;
  if (changeTokens > 0n) {
    tx.addOutput(
      {
        capacity: TOKEN_CELL_CAPACITY,
        lock: owner.script,
        type: sudtType,
      },
      u128ToLeHex(changeTokens),
    );
  }

  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  const txHash = await signer.sendTransaction(tx);
  console.log("SUDT transfer tx sent:", txHash);
  await client.waitTransaction(txHash, 1, 120000, 3000);
  console.log("SUDT transfer tx committed.");
  return txHash;
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));

  const owner = await signer.getRecommendedAddressObj();
  const receiver1 = await ccc.Address.fromString(config.sudtReceiverAddress1, client);
  const receiver2 = await ccc.Address.fromString(config.sudtReceiverAddress2, client);

  const sudtType = await buildSudtTypeScript(owner.script);

  console.log("SUDT code hash:", config.sudtCodeHash);
  console.log("SUDT owner lock hash:", sudtType.args);

  await issueTokens(client, signer, owner, receiver1, sudtType);
  await transferTokens(client, signer, owner, receiver1, receiver2, sudtType);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
