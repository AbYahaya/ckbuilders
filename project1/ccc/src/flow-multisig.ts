import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";
import { hexFromBytes, normalizeHex, signRawTxHash } from "./crypto.js";
import { createLocalClient } from "./local-client.js";

const SHANNONS_PER_CKB = 100000000n;
const FALLBACK_FEE_RATE = 2000n;

function ckbytesToShannons(ckbytes: bigint): bigint {
  return ckbytes * SHANNONS_PER_CKB;
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function getMultisigCellDep(): ccc.CellDep {
  return ccc.CellDep.from({
    outPoint: {
      txHash: config.multisigDepTxHash,
      index: config.multisigDepIndex,
    },
    depType: config.multisigDepType as ccc.DepType,
  });
}

async function buildMultisigLockScript(
  client: ccc.Client,
  addresses: string[],
): Promise<{ lockScript: ccc.Script; multisigScript: string }> {
  const resolved = await Promise.all(
    addresses.map((address) => ccc.Address.fromString(address, client)),
  );
  const argsList = resolved.map((addr) => addr.script.args.slice(2));

  const multisigScript =
    "0x" +
    toHexByte(config.multisigReserved) +
    toHexByte(config.multisigMustMatch) +
    toHexByte(config.multisigThreshold) +
    toHexByte(argsList.length) +
    argsList.join("");

  const multisigScriptHash = ccc.hashCkb(multisigScript).slice(0, 42);

  const lockScript = ccc.Script.from({
    codeHash: config.multisigCodeHash,
    hashType: config.multisigHashType as ccc.HashType,
    args: multisigScriptHash,
  });

  return { lockScript, multisigScript };
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

  throw new Error("No live cells found for multisig script");
}

async function createMultisigCell(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  multisigLock: ccc.Script,
): Promise<string> {
  const tx = ccc.Transaction.from({});

  tx.addOutput(
    {
      capacity: ckbytesToShannons(61n),
      lock: multisigLock,
    },
    "0x",
  );

  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  const txHash = await signer.sendTransaction(tx);
  console.log("Multisig create tx sent:", txHash);
  await client.waitTransaction(txHash, 1, 120000, 3000);
  console.log("Multisig create tx committed.");

  return txHash;
}

async function consumeMultisigCell(
  client: ccc.Client,
  signer: ccc.SignerCkbPrivateKey,
  multisigLock: ccc.Script,
  multisigScript: string,
  signKeys: string[],
): Promise<string> {
  const multisigCell = await findFirstCellByLock(client, multisigLock);
  const receiver = await ccc.Address.fromString(config.receiverAddress, client);

  const inputCapacity = BigInt(multisigCell.cellOutput.capacity);

  const tx = ccc.Transaction.from({});
  tx.addInput({
    previousOutput: multisigCell.outPoint,
    cellOutput: multisigCell.cellOutput,
    outputData: multisigCell.outputData,
  });

  tx.addOutput(
    {
      capacity: inputCapacity,
      lock: receiver.script,
    },
    "0x",
  );

  tx.addCellDeps(getMultisigCellDep());

  const placeholder = multisigScript + "0".repeat(130).repeat(config.multisigThreshold);
  tx.setWitnessArgsAt(0, ccc.WitnessArgs.from({ lock: placeholder }));

  await tx.completeFeeBy(signer, FALLBACK_FEE_RATE);

  const signHashInfo = await tx.getSignHashInfo(multisigLock, client);
  if (!signHashInfo) {
    throw new Error("Failed to compute multisig signing message");
  }

  const signatures = await Promise.all(
    signKeys.map((key) => signRawTxHash(key, signHashInfo.message)),
  );
  const signatureHex = signatures.map((sig) => hexFromBytes(sig).slice(2)).join("");
  const witnessLock = multisigScript + signatureHex;

  tx.setWitnessArgsAt(signHashInfo.position, ccc.WitnessArgs.from({ lock: witnessLock }));

  const signedTx = await signer.signOnlyTransaction(tx);
  const txHash = await client.sendTransaction(signedTx);
  console.log("Multisig consume tx sent:", txHash);
  await client.waitTransaction(txHash, 1, 120000, 3000);
  console.log("Multisig consume tx committed.");

  return txHash;
}

async function main(): Promise<void> {
  const client = createLocalClient();
  const signer = new ccc.SignerCkbPrivateKey(client, normalizeHex(config.privateKey));

  const multisigAddresses = config.multisigAddresses.length
    ? config.multisigAddresses
    : [
        (await signer.getRecommendedAddressObj()).toString(),
        config.multisigFallbackAddress2,
        config.multisigFallbackAddress3,
      ].filter(Boolean);

  if (multisigAddresses.length < 3) {
    throw new Error("Need at least three multisig addresses");
  }

  const signKeys = config.multisigPrivateKeys.length
    ? config.multisigPrivateKeys
    : [config.privateKey, config.multisigFallbackPrivateKey2].filter(Boolean);

  if (signKeys.length < config.multisigThreshold) {
    throw new Error("Not enough multisig private keys configured for threshold");
  }

  const { lockScript, multisigScript } = await buildMultisigLockScript(
    client,
    multisigAddresses,
  );

  console.log("Multisig lock args:", lockScript.args);

  await createMultisigCell(client, signer, lockScript);
  await consumeMultisigCell(
    client,
    signer,
    lockScript,
    multisigScript,
    signKeys.slice(0, config.multisigThreshold),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
