# CAZT

> A Swiss Army knife for interacting with Aztec applications from the command line

[![GitHub](https://img.shields.io/badge/github-zkfrov%2Fcazt-blue)](https://github.com/zkfrov/cazt)

**CAZT = cast + Aztec** is a command-line tool inspired by Foundry's `cast`, but specifically designed for the Aztec Network. It provides a comprehensive set of utilities for interacting with Aztec nodes, computing hashes, managing addresses, and working with Aztec-specific data structures.

## Installation

### Quick Install (One-liner)

```bash
curl -L https://raw.githubusercontent.com/zkfrov/cazt/main/install.sh | bash
```

Or using the install script directly:

```bash
bash <(curl -L https://raw.githubusercontent.com/zkfrov/cazt/main/install.sh)
```

This will:
- Install `cazt` to `~/.cazt/bin`
- Add it to your PATH
- Make it available as the `cazt` command

### Manual Installation

#### Prerequisites

- Node.js 18+ and npm/yarn
- Access to an Aztec Node (or run locally)

#### Install from source

```bash
git clone https://github.com/zkfrov/cazt.git
cd cazt/cazt-node
yarn install
yarn build
```

Then use it in one of these ways:

**Option 1: Use the bin script directly**
```bash
./bin/cazt --help
./bin/cazt address-zero
```

**Option 2: Add to PATH**
```bash
export PATH="$PATH:$(pwd)/bin"
cazt --help
```

**Option 3: Create a symlink**
```bash
ln -s $(pwd)/bin/cazt /usr/local/bin/cazt
cazt --help
```

**Option 4: Development mode (no build needed)**
```bash
yarn start --help
# or
npx tsx cli/cli.ts --help
```

**Option 5: Install globally (after building)**
```bash
# Builds, installs globally, and sets up PATH automatically
yarn install-global

# The script will add npm global bin to your PATH
# You may need to run: source ~/.zshrc (or ~/.bashrc)
# Or just restart your terminal

# Then use from anywhere
cazt --help
cazt address-zero
```

**Note**: If `cazt` command is not found after installation, manually add to PATH:
```bash
# For zsh (macOS default)
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.zshrc && source ~/.zshrc

# For bash
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.bashrc && source ~/.bashrc
```

**Option 6: Development link (faster, no reinstall needed)**
```bash
# Creates a symlink (updates automatically when you rebuild)
yarn link

# Then use from anywhere
cazt --help
```

### Installation via npm/npx

Once published to npm, you can install globally:

```bash
npm install -g cazt
# or
yarn global add cazt
```

Or use `npx` to run without installing:

```bash
npx cazt --help
npx cazt address-zero
```

**Note**: The package needs to be published to npm first. Until then, use the installation script or install from source.

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
