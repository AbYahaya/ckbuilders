import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  rpcUrl: required("CKB_RPC_URL"),
  indexerUrl: required("CKB_INDEXER_URL"),
  privateKey: required("PRIVATE_KEY"),
  hashlockPreimage: optional("HASHLOCK_PREIMAGE", "hello-ckb"),
  lockedCapacityShannons: BigInt(optional("LOCKED_CAPACITY_SHANNONS", "10000000000")),
  lockBinaryPath: optional(
    "LOCK_BINARY_PATH",
    "../contracts/target/riscv64imac-unknown-none-elf/release/pubkey-hash-lock",
  ),
  amountCountLockBinaryPath: optional(
    "AMOUNT_COUNT_LOCK_BINARY_PATH",
    "../contracts/target/riscv64imac-unknown-none-elf/release/amount-count-lock",
  ),
  dataRangeTypeBinaryPath: optional(
    "DATA_RANGE_TYPE_BINARY_PATH",
    "../contracts/target/riscv64imac-unknown-none-elf/release/data-range-type",
  ),
  counterTypeBinaryPath: optional(
    "COUNTER_TYPE_BINARY_PATH",
    "../contracts/target/riscv64imac-unknown-none-elf/release/counter-type",
  ),
  lockCodeHash: required("LOCK_CODE_HASH"),
  lockHashType: required("LOCK_HASH_TYPE"),
  lockTxHash: required("LOCK_TX_HASH"),
  lockTxIndex: required("LOCK_TX_INDEX"),
  amountCountLockCodeHash: required("AMOUNT_COUNT_LOCK_CODE_HASH"),
  amountCountLockHashType: required("AMOUNT_COUNT_LOCK_HASH_TYPE"),
  amountCountLockTxHash: required("AMOUNT_COUNT_LOCK_TX_HASH"),
  amountCountLockTxIndex: required("AMOUNT_COUNT_LOCK_TX_INDEX"),
  dataRangeTypeCodeHash: required("DATA_RANGE_TYPE_CODE_HASH"),
  dataRangeTypeHashType: required("DATA_RANGE_TYPE_HASH_TYPE"),
  dataRangeTypeTxHash: required("DATA_RANGE_TYPE_TX_HASH"),
  dataRangeTypeTxIndex: required("DATA_RANGE_TYPE_TX_INDEX"),
  counterTypeCodeHash: required("COUNTER_TYPE_CODE_HASH"),
  counterTypeHashType: required("COUNTER_TYPE_HASH_TYPE"),
  counterTypeTxHash: required("COUNTER_TYPE_TX_HASH"),
  counterTypeTxIndex: required("COUNTER_TYPE_TX_INDEX"),
  amountCountLockAmountShannons: BigInt(optional("AMOUNT_COUNT_LOCK_AMOUNT_SHANNONS", "10000000000")),
  amountCountLockRequiredCount: Number(optional("AMOUNT_COUNT_LOCK_REQUIRED_COUNT", "2")),
  amountCountLockCreateOutputs: Number(optional("AMOUNT_COUNT_LOCK_CREATE_OUTPUTS", "3")),
  dataRangeTypeCapacityShannons: BigInt(optional("DATA_RANGE_TYPE_CAPACITY_SHANNONS", "13000000000")),
  dataRangeTypeMinBytes: Number(optional("DATA_RANGE_TYPE_MIN_BYTES", "5")),
  dataRangeTypeMaxBytes: Number(optional("DATA_RANGE_TYPE_MAX_BYTES", "64")),
  dataRangeTypeInitialBytes: Number(optional("DATA_RANGE_TYPE_INITIAL_BYTES", "10")),
  dataRangeTypeUpdatedBytes: Number(optional("DATA_RANGE_TYPE_UPDATED_BYTES", "20")),
  counterTypeCapacityShannons: BigInt(optional("COUNTER_TYPE_CAPACITY_SHANNONS", "13000000000")),
  secpCodeHash: optional(
    "SECP_CODE_HASH",
    "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
  ),
  secpHashType: optional("SECP_HASH_TYPE", "type"),
  secpDepTxHash: optional(
    "SECP_DEP_TX_HASH",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ),
  secpDepIndex: optional("SECP_DEP_INDEX", "0x0"),
  secpDepType: optional("SECP_DEP_TYPE", "depGroup"),
  secpExecTxHash: optional(
    "SECP_EXEC_TX_HASH",
    "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
  ),
  secpExecIndexA: optional("SECP_EXEC_INDEX_A", "0x3"),
  secpExecIndexB: optional("SECP_EXEC_INDEX_B", "0x1"),
  acpCodeHash: optional(
    "ACP_CODE_HASH",
    "0xe09352af0066f3162287763ce4ddba9af6bfaeab198dc7ab37f8c71c9e68bb5b",
  ),
  acpHashType: optional("ACP_HASH_TYPE", "type"),
  acpDepTxHash: optional(
    "ACP_DEP_TX_HASH",
    "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
  ),
  acpDepIndex: optional("ACP_DEP_INDEX", "0x8"),
  acpDepType: optional("ACP_DEP_TYPE", "code"),
  daoCodeHash: optional(
    "DAO_CODE_HASH",
    "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
  ),
  daoHashType: optional("DAO_HASH_TYPE", "type"),
  daoDepTxHash: optional(
    "DAO_DEP_TX_HASH",
    "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
  ),
  daoDepIndex: optional("DAO_DEP_INDEX", "0x2"),
  daoDepType: optional("DAO_DEP_TYPE", "code"),
  receiverAddress: required("RECEIVER_ADDRESS"),
};
