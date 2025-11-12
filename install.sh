#!/usr/bin/env bash
# Install script for cazt
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/zkfrov/cazt/main/install.sh | bash
set -euo pipefail

# Colors
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

REPO_URL="https://github.com/zkfrov/cazt.git"
REPO_BRANCH="${CAZT_BRANCH:-main}"     # allow override: CAZT_BRANCH=my-branch

echo -e "${GREEN}Installing cazt...${NC}"

# --- prerequisites ---
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js 20+ first.${NC}"; exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${RED}Error: Node.js 20+ is required. Current version: $(node -v)${NC}"; exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo -e "${RED}Error: git is not installed. Please install git first.${NC}"; exit 1
fi

# Detect package managers
HAS_NPM=0; command -v npm >/dev/null 2>&1 && HAS_NPM=1
HAS_YARN=0; command -v yarn >/dev/null 2>&1 && HAS_YARN=1
if [ $HAS_NPM -eq 0 ] && [ $HAS_YARN -eq 0 ]; then
  echo -e "${RED}Error: neither npm nor yarn is installed. Please install one of them.${NC}"; exit 1
fi

# --- locate source (three cases) ---
if [ -f "package.json" ] && [ -f "bin/cazt" ]; then
  SRC_DIR="$(pwd)"
  echo -e "${YELLOW}Installing from current directory: $SRC_DIR${NC}"
else
  echo -e "${YELLOW}Cloning repository (${REPO_BRANCH})...${NC}"
  TEMP_DIR="$(mktemp -d)"; trap 'rm -rf "$TEMP_DIR"' EXIT
  git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$TEMP_DIR/cazt"
  SRC_DIR="$TEMP_DIR/cazt"
fi

cd "$SRC_DIR"

# --- install deps ---
echo -e "${YELLOW}Installing dependencies...${NC}"
if [ $HAS_NPM -eq 1 ]; then
  npm ci || npm install
else
  yarn install
fi

# --- build (assumes package.json has: "build": "tsc && chmod +x bin/cazt") ---
echo -e "${YELLOW}Building cazt...${NC}"
if [ $HAS_NPM -eq 1 ]; then
  npm run build
else
  yarn build
fi

# --- global install ---
echo -e "${YELLOW}Installing cazt globally...${NC}"
if [ $HAS_NPM -eq 1 ]; then
  npm install -g .
else
  # Yarn v1 fallback via tarball to avoid "invalid package version" bug
  yarn pack -f ./cazt.tgz
  yarn global add ./cazt.tgz
fi

# --- PATH hint ---
BIN_PATH="$(command -v cazt || true)"
if [ -n "$BIN_PATH" ]; then
  echo -e "${GREEN}✓ cazt installed at: $BIN_PATH${NC}"
else
  echo -e "${YELLOW}Installed, but 'cazt' not on PATH yet.${NC}"
  if [ $HAS_NPM -eq 1 ]; then
    GLOB_BIN="$(npm bin -g)"
  else
    GLOB_BIN="$(yarn global bin)"
  fi
  echo -e "${YELLOW}Add this to your shell rc and reload:${NC}"
  echo -e "  export PATH=\"$GLOB_BIN:\$PATH\""
fi

echo -e "${GREEN}Done! Run: cazt --help${NC}"