#!/usr/bin/env bash
# Install script for cazt
# Can be run locally or downloaded and run remotely
# Usage: curl -L https://raw.githubusercontent.com/zkfrov/cazt/main/cazt-node/install.sh | bash

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

INSTALL_DIR="${CAZT_HOME:-$HOME/.cazt}"
BIN_DIR="$INSTALL_DIR/bin"
REPO_URL="https://github.com/zkfrov/cazt.git"

echo -e "${GREEN}Installing cazt...${NC}"

# Check prerequisites
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed. Please install Node.js 18+ first.${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Error: Node.js 18+ is required. Current version: $(node -v)${NC}"
  exit 1
fi

if ! command -v git &> /dev/null; then
  echo -e "${RED}Error: git is not installed. Please install git first.${NC}"
  exit 1
fi

# Determine source directory
if [ -d ".git" ] && [ -f "package.json" ] && [ -d "cazt-node" ]; then
  # Running from repo root
  SRC_DIR="$(pwd)/cazt-node"
  echo -e "${YELLOW}Installing from local directory...${NC}"
elif [ -f "package.json" ] && [ -f "src/index.ts" ]; then
  # Running from cazt-node directory
  SRC_DIR="$(pwd)"
  echo -e "${YELLOW}Installing from local directory...${NC}"
else
  # Remote installation - clone the repo
  echo -e "${YELLOW}Downloading cazt...${NC}"
  TEMP_DIR=$(mktemp -d)
  trap "rm -rf $TEMP_DIR" EXIT
  
  git clone --depth 1 --branch main "$REPO_URL" "$TEMP_DIR/cazt" || {
    echo -e "${RED}Failed to clone repository${NC}"
    exit 1
  }
  SRC_DIR="$TEMP_DIR/cazt/cazt-node"
fi

# Check package manager
if command -v yarn &> /dev/null; then
  PACKAGE_MANAGER="yarn"
elif command -v npm &> /dev/null; then
  PACKAGE_MANAGER="npm"
else
  echo -e "${RED}Error: Neither npm nor yarn is installed. Please install one of them.${NC}"
  exit 1
fi

# Install dependencies and build
echo -e "${YELLOW}Installing dependencies with $PACKAGE_MANAGER...${NC}"
cd "$SRC_DIR"

if [ "$PACKAGE_MANAGER" = "yarn" ]; then
  if [ -f "yarn.lock" ]; then
    yarn install --frozen-lockfile
  else
    yarn install
  fi
  yarn build
else
  if [ -f "package-lock.json" ]; then
    npm ci
  else
    npm install
  fi
  npm run build
fi

# Install to ~/.cazt
echo -e "${YELLOW}Installing cazt to $INSTALL_DIR...${NC}"
mkdir -p "$BIN_DIR"
cp -r "$SRC_DIR/dist" "$INSTALL_DIR/"
cp "$SRC_DIR/package.json" "$INSTALL_DIR/"

# Copy node_modules if it exists (for offline use)
if [ -d "$SRC_DIR/node_modules" ]; then
  cp -r "$SRC_DIR/node_modules" "$INSTALL_DIR/" 2>/dev/null || true
fi

# Create symlink
ln -sf "$INSTALL_DIR/dist/index.js" "$BIN_DIR/cazt"
chmod +x "$BIN_DIR/cazt"

# Add to PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  echo -e "${YELLOW}Adding $BIN_DIR to PATH...${NC}"
  
  if [ -n "${ZSH_VERSION:-}" ]; then
    SHELL_RC="$HOME/.zshrc"
  elif [ -n "${BASH_VERSION:-}" ]; then
    SHELL_RC="$HOME/.bashrc"
  else
    SHELL_RC="$HOME/.profile"
  fi
  
  # Check if already added
  if ! grep -q "$BIN_DIR" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# cazt" >> "$SHELL_RC"
    echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$SHELL_RC"
    echo -e "${GREEN}Added $BIN_DIR to PATH in $SHELL_RC${NC}"
    echo -e "${YELLOW}Run 'source $SHELL_RC' or restart your terminal to use cazt${NC}"
  else
    echo -e "${GREEN}$BIN_DIR is already in PATH${NC}"
  fi
else
  echo -e "${GREEN}$BIN_DIR is already in PATH${NC}"
fi

echo -e "${GREEN}✓ cazt installed successfully!${NC}"
echo -e "${GREEN}Run 'cazt --help' to get started${NC}"
