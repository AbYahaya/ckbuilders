#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
OUT_DIR="$ROOT_DIR/offckb/dist-rust"

RUSTFLAGS="-C target-feature=-a" \
	cargo build --release --target riscv64imac-unknown-none-elf --manifest-path "$CONTRACTS_DIR/Cargo.toml"

SRC_BIN="$CONTRACTS_DIR/target/riscv64imac-unknown-none-elf/release/pubkey-hash-lock"
DST_BIN="$OUT_DIR/pubkey-hash-lock"

cp "$SRC_BIN" "$DST_BIN"
riscv64-unknown-elf-strip "$DST_BIN"

ls -lh "$DST_BIN"
echo "Built stripped lock binary at: $DST_BIN"
