import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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
  agreementVersionTypeBinaryPath: optional(
    "AGREEMENT_VERSION_TYPE_BINARY_PATH",
    "../contracts/target/riscv64imac-unknown-none-elf/release/agreement-version-type",
  ),
  agreementAcceptanceTypeBinaryPath: optional(
    "AGREEMENT_ACCEPTANCE_TYPE_BINARY_PATH",
    "../contracts/target/riscv64imac-unknown-none-elf/release/agreement-acceptance-type",
  ),
  storeFilePath: optional("STORE_FILE_PATH", "../files/HelloNervos.txt"),
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
  agreementVersionTypeCodeHash: optional("AGREEMENT_VERSION_TYPE_CODE_HASH", ""),
  agreementVersionTypeHashType: optional("AGREEMENT_VERSION_TYPE_HASH_TYPE", ""),
  agreementVersionTypeTxHash: optional("AGREEMENT_VERSION_TYPE_TX_HASH", ""),
  agreementVersionTypeTxIndex: optional("AGREEMENT_VERSION_TYPE_TX_INDEX", ""),
  agreementAcceptanceTypeCodeHash: optional("AGREEMENT_ACCEPTANCE_TYPE_CODE_HASH", ""),
  agreementAcceptanceTypeHashType: optional("AGREEMENT_ACCEPTANCE_TYPE_HASH_TYPE", ""),
  agreementAcceptanceTypeTxHash: optional("AGREEMENT_ACCEPTANCE_TYPE_TX_HASH", ""),
  agreementAcceptanceTypeTxIndex: optional("AGREEMENT_ACCEPTANCE_TYPE_TX_INDEX", ""),
  amountCountLockAmountShannons: BigInt(optional("AMOUNT_COUNT_LOCK_AMOUNT_SHANNONS", "10000000000")),
  amountCountLockRequiredCount: Number(optional("AMOUNT_COUNT_LOCK_REQUIRED_COUNT", "2")),
  amountCountLockCreateOutputs: Number(optional("AMOUNT_COUNT_LOCK_CREATE_OUTPUTS", "3")),
  dataRangeTypeCapacityShannons: BigInt(optional("DATA_RANGE_TYPE_CAPACITY_SHANNONS", "13000000000")),
  dataRangeTypeMinBytes: Number(optional("DATA_RANGE_TYPE_MIN_BYTES", "5")),
  dataRangeTypeMaxBytes: Number(optional("DATA_RANGE_TYPE_MAX_BYTES", "64")),
  dataRangeTypeInitialBytes: Number(optional("DATA_RANGE_TYPE_INITIAL_BYTES", "10")),
  dataRangeTypeUpdatedBytes: Number(optional("DATA_RANGE_TYPE_UPDATED_BYTES", "20")),
  counterTypeCapacityShannons: BigInt(optional("COUNTER_TYPE_CAPACITY_SHANNONS", "13000000000")),
  agreementTextPath: optional("AGREEMENT_TEXT_PATH", "../files/Agreement-v1.txt"),
  agreementUri: optional("AGREEMENT_URI", "https://example.com/agreements/v1"),
  agreementVersion: Number(optional("AGREEMENT_VERSION", "1")),
  agreementCapacityShannons: BigInt(optional("AGREEMENT_CAPACITY_SHANNONS", "15000000000")),
  acceptanceCapacityShannons: BigInt(optional("ACCEPTANCE_CAPACITY_SHANNONS", "15000000000")),
  sudtCodeHash: optional(
    "SUDT_CODE_HASH",
    "0x6283a479a3cf5d4276cd93594de9f1827ab9b55c7b05b3d28e4c2e0a696cfefd",
  ),
  sudtHashType: optional("SUDT_HASH_TYPE", "type"),
  sudtDepTxHash: optional(
    "SUDT_DEP_TX_HASH",
    "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
  ),
  sudtDepIndex: optional("SUDT_DEP_INDEX", "0x5"),
  sudtDepType: optional("SUDT_DEP_TYPE", "code"),
  multisigCodeHash: optional(
    "MULTISIG_CODE_HASH",
    "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
  ),
  multisigHashType: optional("MULTISIG_HASH_TYPE", "type"),
  multisigDepTxHash: optional(
    "MULTISIG_DEP_TX_HASH",
    "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
  ),
  multisigDepIndex: optional("MULTISIG_DEP_INDEX", "0x1"),
  multisigDepType: optional("MULTISIG_DEP_TYPE", "depGroup"),
  multisigReserved: Number(optional("MULTISIG_RESERVED", "0")),
  multisigMustMatch: Number(optional("MULTISIG_MUST_MATCH", "0")),
  multisigThreshold: Number(optional("MULTISIG_THRESHOLD", "2")),
  multisigAddresses: parseList(optional("MULTISIG_ADDRESSES", "")),
  multisigPrivateKeys: parseList(optional("MULTISIG_PRIVATE_KEYS", "")),
  multisigFallbackAddress2: optional("MULTISIG_FALLBACK_ADDRESS_2", ""),
  multisigFallbackAddress3: optional("MULTISIG_FALLBACK_ADDRESS_3", ""),
  multisigFallbackPrivateKey2: optional("MULTISIG_FALLBACK_PRIVATE_KEY_2", ""),
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
  sudtReceiverAddress1: optional("SUDT_RECEIVER_ADDRESS_1", required("RECEIVER_ADDRESS")),
  sudtReceiverAddress2: optional("SUDT_RECEIVER_ADDRESS_2", optional("SUDT_RECEIVER_ADDRESS_1", required("RECEIVER_ADDRESS"))),
};
