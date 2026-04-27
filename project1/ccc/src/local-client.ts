import * as ccc from "@ckb-ccc/core";
import { config } from "./config.js";

class SplitRpcTransport {
  constructor(
    private readonly ckbRpcUrl: string,
    private readonly indexerUrl: string,
  ) {}

  async request(payload: {
    id: number;
    jsonrpc: "2.0";
    method: string;
    params: unknown[] | Record<string, unknown>;
  }): Promise<unknown> {
    const indexerMethods = new Set([
      "get_cells",
      "get_transactions",
      "get_cells_capacity",
    ]);
    const url = indexerMethods.has(payload.method)
      ? this.indexerUrl
      : this.ckbRpcUrl;

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`JSON-RPC HTTP ${response.status} from ${url}`);
    }

    return response.json();
  }
}

export function createLocalClient(): ccc.ClientPublicTestnet {
  const requestor = new ccc.RequestorJsonRpc(config.rpcUrl, {
    transport: new SplitRpcTransport(config.rpcUrl, config.indexerUrl) as never,
  });

  const scripts = {
    [ccc.KnownScript.Secp256k1Blake160]: {
      codeHash: config.secpCodeHash,
      hashType: config.secpHashType,
      cellDeps: [
        {
          cellDep: {
            outPoint: {
              txHash: config.secpDepTxHash,
              index: config.secpDepIndex,
            },
            depType: config.secpDepType,
          },
        },
      ],
    },
    [ccc.KnownScript.AnyoneCanPay]: {
      codeHash: config.acpCodeHash,
      hashType: config.acpHashType,
      cellDeps: [
        {
          cellDep: {
            outPoint: {
              txHash: config.acpDepTxHash,
              index: config.acpDepIndex,
            },
            depType: config.acpDepType,
          },
        },
      ],
    },
    [ccc.KnownScript.NervosDao]: {
      codeHash: config.daoCodeHash,
      hashType: config.daoHashType,
      cellDeps: [
        {
          cellDep: {
            outPoint: {
              txHash: config.daoDepTxHash,
              index: config.daoDepIndex,
            },
            depType: config.daoDepType,
          },
        },
      ],
    },
  } as unknown as Record<ccc.KnownScript, ccc.ScriptInfoLike | undefined>;

  return new ccc.ClientPublicTestnet({
    url: config.rpcUrl,
    requestor,
    scripts,
  });
}
