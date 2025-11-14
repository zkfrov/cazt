# CAZT

> A Swiss Army knife for interacting with Aztec applications from the command line

[![GitHub](https://img.shields.io/badge/github-zkfrov%2Fcazt-blue)](https://github.com/zkfrov/cazt)

**CAZT = cast + Aztec** is a command-line tool inspired by Foundry's `cast`, but specifically designed for the Aztec Network. It provides a comprehensive set of utilities for interacting with Aztec nodes, computing hashes, managing addresses, and working with Aztec-specific data structures.

## Installation

### Prerequisites

- **Node.js** 20+ and npm/yarn
- (Optional) Access to an Aztec Node for RPC commands

### Method 1: From Source

```bash
# Clone and build
git clone https://github.com/zkfrov/cazt.git
cd cazt
yarn install
yarn build

# Install globally
yarn install-global
```

### Method 2: Development Setup

For local development without global installation:

```bash
git clone https://github.com/zkfrov/cazt.git
cd cazt
yarn install

# Use directly (no build needed)
yarn start --help
# or
npx tsx cli/cli.ts --help

# Or build and use locally
yarn build
./bin/cazt --help
```

### Method 3: npm/npx (Once Published)

```bash
# Global installation
npm install -g cazt

# Or use without installing
npx cazt --help
```

**Note**: The package needs to be published to npm first. Until then, use Method 1 or 2.

### Building Aztec Standards Artifacts

To use Aztec Standards contract artifacts, you need to build them first:

```bash
# Build aztec-standards artifacts (stored in .aztec-standards/)
yarn build-aztec-standards [commit-or-tag]

# Default builds from origin/dev
yarn build-aztec-standards
```

This will clone the [aztec-standards repository](https://github.com/defi-wonderland/aztec-standards), build the contracts, and store the artifacts in `.aztec-standards/target/` (hidden folder).

### Troubleshooting

If `cazt` command is not found after installation:

```bash
# Add npm global bin to PATH
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.zshrc && source ~/.zshrc
# (Use ~/.bashrc for bash)
```

## Usage

### Basic Commands

```bash
# Get help
cazt --help

# Utility commands (output raw values by default)
cazt address-zero
cazt keccak "hello world"
cazt field-random
cazt sha256 "test"

# Output as JSON
cazt --json address-zero

# RPC commands (require running Aztec node)
cazt block number
cazt tx get <tx-hash>
```

### Configuration

Set environment variables or use flags:

```bash
# Set default RPC URL
export CAZT_RPC_URL=http://localhost:8080
export CAZT_ADMIN_URL=http://localhost:8880

# Or use flags
cazt --rpc-url http://localhost:8080 block number
```

## Features

### Utility Commands

- **Aztec Address utilities**: `address-zero`, `address-random`, `address-validate`, `address-from-field`, `address-to-point`, etc.
- **Ethereum Address utilities**: `eth-address-zero`, `eth-address-random`, `eth-address-validate`, `eth-address-from-field`, `eth-address-to-field`, `eth-address-is-zero`
- **Address computation**: `compute-contract-address`, `compute-partial-address`, `compute-preaddress`, `compute-address-from-keys`, `compute-salted-initialization-hash`, `compute-initialization-hash`
- **Hash functions**: `keccak`, `sha256`, `poseidon2`, `secret-hash`, `hash-vk`, `var-args-hash`, `calldata-hash`, etc.
- **Field operations**: `field-random`, `field-from-string`, `field-to-string`, `field-equals`, `field-is-zero`, `field-from-buffer`, `field-to-buffer`, etc.
- **Selector utilities**: `sig`, `selector-from-signature`, `event-selector`, `note-selector`, `selector-from-field`, etc.
- **ABI encoding/decoding**: `abi-encode`, `abi-decode`, `decode-function-signature`
- **Contract artifacts**: `artifact-hash`, `artifact-hash-preimage`, `artifact-metadata-hash`, `function-artifact-hash`, `load-contract-artifact`, etc.
- **Note & Nullifier utilities**: `silo-nullifier`, `silo-note-hash`, `unique-note-hash`, `note-hash-nonce`, `silo-private-log`
- **Message utilities**: `l1-to-l2-message-nullifier`, `l2-to-l1-message-hash`
- **Storage utilities**: `public-data-slot`, `note-slot`, `storage-layout`

### Note Queries

- **Fetch notes**: `notes fetch` - Fetch notes from a wallet for a given storage slot
  - Automatically deserializes notes (replaces note buffer with array of field strings)
  - Registers contract with wallet using provided artifact
  - Creates accounts from secret keys and adds them to scopes
  - Supports multiple accounts via multiple secret keys

### Artifact Management

- **List artifacts**: `artifacts aztec` - List all available Aztec contract artifacts from `@aztec/noir-contracts.js`
- **List standards**: `artifacts standards` - List all available Aztec Standards contract artifacts from `.aztec-standards/target/`

### RPC Commands

- **Block queries**: `block number`, `block get`, `block header`
- **Transaction queries**: `tx get`, `tx receipt`
- **State queries**: `state storage`, `state note`
- **Merkle tree queries**: `merkle root`, `merkle siblings`
- **Logs**: `logs get`, `logs get-unencrypted`
- **Contract queries**: `contract call`, `contract view`
- **Node info**: `node version`, `node status`

### Output Format

By default, utility commands output raw values (like `cast`):

```bash
$ cazt address-zero
0x0000000000000000000000000000000000000000000000000000000000000000

$ cazt keccak "hello"
0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad
```

Use `--json` flag for JSON output:

```bash
$ cazt --json address-zero
{
  "value": "0x0000000000000000000000000000000000000000000000000000000000000000"
}
```

RPC commands always output JSON (pretty-printed by default, use `--no-pretty` for compact).

## Examples

### Basic Utilities

```bash
# Generate a random field element
cazt field-random

# Compute Keccak hash
cazt keccak "hello world"

# Compute function selector
cazt sig "transfer(address,uint256)"

# Validate an Aztec address
cazt address-validate "0x0000000000000000000000000000000000000000000000000000000000000000"

# Validate an Ethereum address
cazt eth-address-validate "0x0000000000000000000000000000000000000000"

# Get zero addresses
cazt address-zero
cazt eth-address-zero

# Compute Poseidon2 hash
cazt poseidon2 '["0x1","0x2"]'

# Silo a nullifier
cazt silo-nullifier --contract <address> --nullifier <value>
```

### Note Queries

```bash
# Fetch notes using artifact name (from aztec or standards)
cazt notes fetch \
  --contract 0x08ded8acfa50e8d138c782f84f835133c1ca4803040bf6dc2bfd028294321373 \
  --artifact standards:Token \
  --storage-slot-name private_balances \
  --storage-slot-key 0x18db9a39c0c2475c662aa7babc1dedec40b5a7cb1779fc96e763364f2328c12d \
  --sender 0x11deabd59b872d17c737b66f61d332230f341e774c6b5d3762f46a74536f947f \
  --secret-key 0x0aebd1b4be76efa44f5ee655c20bf9ea60f7ae44b9a7fd1fd9f189c7a0b0cdae

# Fetch notes using direct storage slot
cazt notes fetch \
  --contract <address> \
  --artifact path/to/artifact.json \
  --storage-slot 7 \
  --sender <sender-address> \
  --secret-key <secret-key>

# Fetch notes with multiple accounts (comma-separated or multiple flags)
cazt notes fetch \
  --contract <address> \
  --artifact aztec:Token \
  --storage-slot-name balances \
  --storage-slot-key <user-address> \
  --secret-keys <key1>,<key2> \
  --salts <salt1>,<salt2>

# Or use multiple flags
cazt notes fetch \
  --contract <address> \
  --artifact aztec:Token \
  --storage-slot-name balances \
  --storage-slot-key <user-address> \
  --secret-key <key1> --secret-key <key2> \
  --salt <salt1> --salt <salt2>

# Fetch notes with additional filters
cazt notes fetch \
  --contract <address> \
  --artifact standards:Token \
  --storage-slot-name private_balances \
  --storage-slot-key <user-address> \
  --sender <sender-address> \
  --secret-key <secret-key> \
  --status ACTIVE \
  --siloed-nullifier <nullifier> \
  --scopes <address1>,<address2>

# Fetch notes with debug logging (shows PXE INFO logs)
cazt notes fetch \
  --contract <address> \
  --artifact standards:Token \
  --storage-slot-name private_balances \
  --storage-slot-key <user-address> \
  --sender <sender-address> \
  --secret-key <secret-key> \
  --debug

# Register contract with secret key for note decryption
cazt notes fetch \
  --contract <address> \
  --artifact standards:Token \
  --contract-secret-key <contract-secret-key> \
  --storage-slot-name private_balances \
  --storage-slot-key <user-address> \
  --sender <sender-address> \
  --secret-key <secret-key>
```

**Note Fetch Options:**
- `--contract <address>` (required): Contract address
- `--artifact <path|name>` (required): Artifact file path, artifact name (e.g., `aztec:Token`, `standards:Token`), or JSON string
- `--contract-secret-key <key>` (optional): Secret key for contract registration (needed for note decryption)
- `--sender <address>` (optional): Sender address to register with wallet and use for scopes filtering
- `--storage-slot <slot>` (optional): Direct storage slot (Fr) - number or field value
- `--storage-slot-name <name>` (optional): Storage slot name from artifact (e.g., "balances", "private_balances")
- `--storage-slot-key <key>` (optional): Key for deriving slot in map (required if using `--storage-slot-name` for map slots)
- `--secret-key <key>` (optional): Secret key for account creation (can be provided multiple times)
- `--secret-keys <keys>` (optional): Comma-separated list of secret keys (alternative to multiple `--secret-key`)
- `--salt <salt>` (optional): Salt for account creation (defaults to 0 if not provided, can be provided multiple times)
- `--salts <salts>` (optional): Comma-separated list of salts (alternative to multiple `--salt`)
- `--status <status>` (optional): Note status filter - `ACTIVE`, `CANCELLED`, or `SETTLED` (default: `ACTIVE`)
- `--siloed-nullifier <nullifier>` (optional): Filter by siloed nullifier
- `--scopes <addresses>` (optional): Comma-separated list of scope addresses (account addresses are automatically added)
- `--node-url <url>` (optional): Node URL (default: `http://localhost:8080` or `CAZT_RPC_URL` env var)
- `--debug` (optional): Enable debug logging (shows PXE INFO logs, otherwise suppressed)

**Note Fetch Output:**
Returns JSON with a `notes` array. Each note contains:
- `note`: Array of deserialized field strings (replaces the raw note buffer)
- `recipient`: Recipient address
- `contractAddress`: Contract address
- `storageSlot`: Storage slot
- `txHash`: Transaction hash
- `noteNonce`: Note nonce

### Artifact Management

```bash
# List all available Aztec contract artifacts
cazt artifacts aztec

# List with full details
cazt artifacts aztec --full

# List all available Aztec Standards contract artifacts
cazt artifacts standards

# List with full details
cazt artifacts standards --full
```

### Storage Utilities

```bash
# Derive storage slot in a map
cazt note-slot \
  --base-slot 0x1234... \
  --key 0x18db9a39c0c2475c662aa7babc1dedec40b5a7cb1779fc96e763364f2328c12d

# Get storage layout from artifact
cazt storage-layout --artifact path/to/artifact.json
# or using artifact name
cazt storage-layout --artifact aztec:Token
cazt storage-layout --artifact standards:Escrow
```

### RPC Commands

```bash
# Get block number (requires running node)
cazt block number

# Call a contract function (requires running node)
cazt contract call --address <address> --function <selector> --args <args>
```

## Artifact Sources

CAZT supports multiple artifact sources:

1. **Aztec artifacts** (`aztec:ContractName`): Built-in artifacts from `@aztec/noir-contracts.js`
   - Example: `aztec:Token`, `aztec:Escrow`

2. **Standards artifacts** (`standards:ContractName`): Artifacts from Aztec Standards (requires building first)
   - Example: `standards:Token`, `standards:Escrow`
   - Build with: `yarn build-aztec-standards`

3. **File paths**: Direct paths to JSON artifact files
   - Example: `path/to/artifact.json` or `@artifact.json`

4. **JSON strings**: Inline JSON artifact data

## Notes Fetch Details

The `notes fetch` command:

1. **Connects to Aztec Node**: Creates a connection to the specified node (default: `http://localhost:8080`)
2. **Creates Wallet**: Sets up a TestWallet with PXE
3. **Registers Contract**: Registers the contract with the wallet using the provided artifact (and optional contract secret key for decryption)
4. **Registers Sender**: If `--sender` is provided, registers the sender address with the wallet
5. **Creates Accounts**: Creates account managers from provided secret keys (salt defaults to 0 if not provided)
6. **Determines Scopes**: Combines provided scopes with all account manager addresses
7. **Fetches Notes**: Retrieves notes matching the filter criteria
8. **Deserializes Notes**: Automatically deserializes note buffers into arrays of field strings

**Important Notes:**
- Salt defaults to `Fr.ZERO` (0) if not provided
- Multiple secret keys create multiple account managers, all added to scopes
- The contract must be registered before fetching notes (done automatically)
- Notes are automatically deserialized - the raw note buffer is replaced with an array of field strings
- PXE INFO logs are suppressed by default (use `--debug` to see them)

## Development

```bash
# Install dependencies
yarn install

# Build (compiles TypeScript to dist/)
yarn build

# Run in development mode (no build needed, uses tsx)
yarn start --help
yarn start address-zero

# Or run directly with tsx
npx tsx cli/cli.ts --help

# Clean build artifacts
yarn clean

# Make cazt globally available (builds and installs)
yarn install-global

# Or use yarn link for development (creates symlink, faster)
yarn link
# Then use: cazt --help (from anywhere)

# Build aztec-standards artifacts
yarn build-aztec-standards

# Run tests
yarn test
# or
npx tsx cli/test.ts
```

### Project Structure

```
cazt/
├── bin/
│   └── cazt              # Wrapper script (executes dist/cli.js)
├── cli/                  # TypeScript source files
│   ├── cli.ts           # Main CLI entry point
│   ├── index.ts         # Library exports
│   ├── test.ts          # Test suite
│   └── utils/           # Utility modules
├── dist/                # Compiled JavaScript (generated)
├── .aztec-standards/    # Aztec Standards artifacts (hidden, generated)
│   ├── artifacts/       # TypeScript artifact files
│   └── target/          # JSON artifact files
├── scripts/             # Build scripts
│   └── build-aztec-standards.ts
└── package.json
```

## Repository

- **GitHub**: https://github.com/zkfrov/cazt
- **Version**: 3.0.0-devnet.2

## License

MIT