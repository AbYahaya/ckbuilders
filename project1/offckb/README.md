# offckb

Standalone offckb workspace for practical local development.

## What this workspace is for

1. Start a local CKB devnet.
2. Build and deploy the Rust lock binary from ../contracts.
3. Export devnet system script metadata for off-chain clients.

## Commands

Start devnet in one terminal:

npm run devnet:start

Show funded devnet accounts:

npm run devnet:accounts

Build and strip Rust lock binary:

npm run build:rust-lock

Deploy stripped Rust lock binary:

npm run deploy:rust-lock -- --privkey 0xYOUR_DEVNET_PRIVKEY

Deploy non-interactively:

npm run deploy:rust-lock:yes -- --privkey 0xYOUR_DEVNET_PRIVKEY

Export system scripts in ccc format:

npm run devnet:system:ccc

## Deployment outputs

Rust lock deployment artifacts:

- deployment-rust/scripts.json
- deployment-rust/devnet/pubkey-hash-lock/deployment.toml

System scripts export:

- deployment/system-scripts-ccc.json

## Notes

- build:rust-lock generates offckb/dist-rust/pubkey-hash-lock
- offckb deploy has size checks, so using the stripped binary is required
- All accounts from offckb accounts are for local testing only
