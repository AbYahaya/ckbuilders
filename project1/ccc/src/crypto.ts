import { blake2b } from "@noble/hashes/blake2b";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { getPublicKey, signAsync } from "@noble/secp256k1";

export function normalizeHex(input: string): string {
  return input.startsWith("0x") ? input.slice(2) : input;
}

export function to0x(hex: string): string {
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

export function pubkeyHash160(compressedPubkey: Uint8Array): Uint8Array {
  const hash = blake2b(compressedPubkey, { dkLen: 32 });
  return hash.slice(0, 20);
}

export function blake2b256(data: Uint8Array): Uint8Array {
  return blake2b(data, { dkLen: 32 });
}

export function getCompressedPubkey(privateKeyHex: string): Uint8Array {
  const pk = hexToBytes(normalizeHex(privateKeyHex));
  return getPublicKey(pk, true);
}

export async function signRawTxHash(privateKeyHex: string, rawTxHashHex: string): Promise<Uint8Array> {
  const msg = hexToBytes(normalizeHex(rawTxHashHex));
  const pk = hexToBytes(normalizeHex(privateKeyHex));
  const sig = await signAsync(msg, pk, { extraEntropy: true });
  const out = new Uint8Array(65);
  out.set(sig.toCompactRawBytes(), 0);
  out[64] = sig.recovery;
  return out;
}

export function hexFromBytes(data: Uint8Array): string {
  return to0x(bytesToHex(data));
}
