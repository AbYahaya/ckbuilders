import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import { normalizeHex } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const SHANNONS_PER_CKB = 100000000n;
const FALLBACK_FEE_RATE = 1000n;

function ckbytesToShannons(ckbytes: bigint): bigint {
  return ckbytes * SHANNONS_PER_CKB;
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));

  const sender = await signer.getRecommendedAddressObj();
  const binaryPath = resolve(config.dataRangeTypeBinaryPath);
  const binary = readFileSync(binaryPath);
  const dataHex = ccc.hexFrom(binary);

  const dataBytes = BigInt(binary.length);
  const occupiedCkb = 61n + dataBytes;
  const capacity = ckbytesToShannons(occupiedCkb);

  const tx = ccc.Transaction.from({});
  tx.addOutput(
    {
      capacity,
      lock: sender.script,
    },
    dataHex,
  );

  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  const txHash = await signer.sendTransaction(tx);
  console.log("Deploy tx sent:", txHash);
  await client.waitTransaction(txHash, 1, 120000, 3000);
  console.log("Deploy tx committed.");

  const codeHash = ccc.hashCkb(dataHex);

  console.log("\nSet these in your .env:\n");
  console.log(`DATA_RANGE_TYPE_CODE_HASH=${codeHash}`);
  console.log("DATA_RANGE_TYPE_HASH_TYPE=data");
  console.log(`DATA_RANGE_TYPE_TX_HASH=${txHash}`);
  console.log("DATA_RANGE_TYPE_TX_INDEX=0x0");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
