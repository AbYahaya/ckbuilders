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

  const filePath = resolve(config.storeFilePath);
  const data = readFileSync(filePath);
  const dataHex = ccc.hexFrom(data);
  const capacity = ckbytesToShannons(61n + BigInt(data.length));

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
  console.log("Store file tx sent:", txHash);
  await client.waitTransaction(txHash, 1, 120000, 3000);
  console.log("Store file tx committed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
