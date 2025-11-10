# CAZT

> A Swiss Army knife for interacting with Aztec applications from the command line

[![GitHub](https://img.shields.io/badge/github-zkfrov%2Fcazt-blue)](https://github.com/zkfrov/cazt)

**CAZT = cast + Aztec** is a command-line tool inspired by Foundry's `cast`, but specifically designed for the Aztec Network. It provides a comprehensive set of utilities for interacting with Aztec nodes, computing hashes, managing addresses, and working with Aztec-specific data structures.

## Installation

### Quick Install (One-liner)

```bash
curl -L https://raw.githubusercontent.com/zkfrov/cazt/main/cazt-node/install.sh | bash
```

Or using the install script directly:

```bash
bash <(curl -L https://raw.githubusercontent.com/zkfrov/cazt/main/cazt-node/install.sh)
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

Then add to PATH:
```bash
export PATH="$PATH:$(pwd)/dist"
# Or create a symlink:
ln -s $(pwd)/dist/index.js /usr/local/bin/cazt
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

- **Address utilities**: `address-zero`, `address-random`, `address-validate`, `address-from-field`, etc.
- **Hash functions**: `keccak`, `sha256`, `poseidon2`, `secret-hash`, etc.
- **Field operations**: `field-random`, `field-from-string`, `field-to-string`, `field-equals`, etc.
- **Selector utilities**: `sig`, `selector-from-signature`, `event-selector`, `note-selector`, etc.
- **ABI encoding/decoding**: `abi-encode`, `abi-decode`, `decode-function-signature`
- **Contract artifacts**: `artifact-hash`, `load-contract-artifact`, etc.

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

# Validate an address
cazt address-validate "0x0000000000000000000000000000000000000000000000000000000000000000"

# Get block number (requires running node)
cazt block number

# Call a contract function (requires running node)
cazt contract call --address <address> --function <selector> --args <args>
```

## Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Run in development mode
yarn dev

# Run tests (if available)
yarn test
```

## Repository

- **GitHub**: https://github.com/zkfrov/cazt
- **Version**: 3.0.0-devnet.2

## License

MIT
