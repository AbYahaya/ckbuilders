import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import {
  blake2b256,
  hexFromBytes,
  normalizeHex,
} from "./crypto.js";
import { hexToBytes, utf8ToBytes } from "@noble/hashes/utils";
import { createLocalClient } from "./local-client.js";

const FALLBACK_FEE_RATE = 1000n;

function getPreimageBytes(): Uint8Array {
  const preimage = config.hashlockPreimage;
  if (preimage.startsWith("0x")) {
    return hexToBytes(normalizeHex(preimage));
  }
  return utf8ToBytes(preimage);
}

function getHashlockLockScript(preimage: Uint8Array): ccc.Script {
  const args = hexFromBytes(blake2b256(preimage));
  return ccc.Script.from({
    codeHash: config.lockCodeHash,
    hashType: config.lockHashType as ccc.HashType,
    args,
  });
}

function getCustomLockCellDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: config.lockTxHash,
      index: config.lockTxIndex,
    },
    depType: "code",
  });
}

async function createLockedCellWithCCC(
  signer: ccc.SignerCkbPrivateKey,
  hashlock: ccc.Script,
): Promise<string> {
  const tx = ccc.Transaction.from({});

  tx.addOutput(
    {
      capacity: config.lockedCapacityShannons,
      lock: hashlock,
    },
    "0x",
  );

  tx.addCellDeps(getCustomLockCellDep());
  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  return signer.sendTransaction(tx);
}

async function findFirstCellByLock(
  client: ccc.Client,
  lock: ccc.Script,
): Promise<ccc.Cell> {
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

  throw new Error("No live cells found for hashlock script");
}

async function unlockLockedCellWithCCC(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  hashlock: ccc.Script,
  preimage: Uint8Array,
): Promise<string> {
  const lockedCell = await findFirstCellByLock(client, hashlock);
  const receiver = await ccc.Address.fromString(config.receiverAddress, client);

  const tx = ccc.Transaction.from({});
  tx.addInput({
    previousOutput: lockedCell.outPoint,
    cellOutput: lockedCell.cellOutput,
    outputData: lockedCell.outputData,
  });

  tx.addOutput(
    {
      capacity: lockedCell.cellOutput.capacity,
      lock: receiver.script,
    },
    "0x",
  );

  tx.addCellDeps(getCustomLockCellDep());

  tx.setWitnessArgsAt(
    0,
    ccc.WitnessArgs.from({ lock: hexFromBytes(preimage) }),
  );

  await tx.completeFeeChangeToOutput(signer, 0, FALLBACK_FEE_RATE, undefined, {
    shouldAddInputs: false,
  });

  return client.sendTransaction(tx);
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));

  const preimage = getPreimageBytes();
  const hashlock = getHashlockLockScript(preimage);

  console.log("Using RPC:", config.rpcUrl);
  console.log("Using Indexer:", config.indexerUrl);
  console.log("Custom lock code hash:", config.lockCodeHash);
  console.log("Custom lock hash type:", config.lockHashType);
  console.log("Custom lock dep out-point:", `${config.lockTxHash}:${config.lockTxIndex}`);
  console.log("Hashlock preimage (hex):", hexFromBytes(preimage));
  console.log("Hashlock args (blake2b-256):", hashlock.args);

  const lockTxHash = await createLockedCellWithCCC(signer, hashlock);
  console.log("Create locked cell tx sent:", lockTxHash);
  await client.waitTransaction(lockTxHash, 1, 120000, 3000);
  console.log("Create tx committed.");

  const unlockTxHash = await unlockLockedCellWithCCC(client, signer, hashlock, preimage);
  console.log("Unlock tx sent:", unlockTxHash);
  await client.waitTransaction(unlockTxHash, 1, 120000, 3000);
  console.log("Unlock tx committed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
