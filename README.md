# CAZT

> A Swiss Army knife for interacting with Aztec applications from the command line

[![GitHub](https://img.shields.io/badge/github-zkfrov%2Fcazt-blue)](https://github.com/zkfrov/cazt)

**CAZT = cast + Aztec** is a command-line tool inspired by Foundry's `cast`, but specifically designed for the Aztec Network. It provides a comprehensive set of utilities for interacting with Aztec nodes, computing hashes, managing addresses, and working with Aztec-specific data structures.

## Installation

### Prerequisites

- **Node.js** 20+ and npm/yarn
- (Optional) Access to an Aztec Node for RPC commands

### Method 1: Install Script (Recommended)

```bash
curl -L https://raw.githubusercontent.com/zkfrov/cazt/main/install.sh | bash
```

This installs `cazt` to `~/.cazt/bin` and adds it to your PATH.

### Method 2: From Source

```bash
# Clone and build
git clone https://github.com/zkfrov/cazt.git
cd cazt/cazt-node
yarn install
yarn build

# Install globally
yarn install-global
```

After installation, restart your terminal or run:
```bash
# For zsh (macOS default)
source ~/.zshrc

# For bash
source ~/.bashrc
```

### Method 3: Development Setup

For local development without global installation:

```bash
git clone https://github.com/zkfrov/cazt.git
cd cazt/cazt-node
yarn install

# Use directly (no build needed)
yarn start --help
# or
npx tsx cli/cli.ts --help

# Or build and use locally
yarn build
./bin/cazt --help
```

### Method 4: npm/npx (Once Published)

```bash
# Global installation
npm install -g cazt

# Or use without installing
npx cazt --help
```

**Note**: The package needs to be published to npm first. Until then, use Method 1 or 2.

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
- **Storage utilities**: `public-data-slot`

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

# Get block number (requires running node)
cazt block number

# Call a contract function (requires running node)
cazt contract call --address <address> --function <selector> --args <args>
```

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

# Run tests
yarn test
# or
npx tsx cli/test.ts
```

### Project Structure

```
cazt-node/
├── bin/
│   └── cazt              # Wrapper script (executes dist/cli.js)
├── cli/                  # TypeScript source files
│   ├── cli.ts           # Main CLI entry point
│   ├── index.ts         # Library exports
│   ├── test.ts          # Test suite
│   └── utils/           # Utility modules
├── dist/                # Compiled JavaScript (generated)
└── package.json
```

## Repository

- **GitHub**: https://github.com/zkfrov/cazt
- **Version**: 3.0.0-devnet.2

## License

MIT
