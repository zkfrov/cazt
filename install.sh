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

if ! command -v yarn &> /dev/null && ! command -v npm &> /dev/null; then
  echo -e "${RED}Error: Neither npm nor yarn is installed. Please install one of them.${NC}"
  exit 1
fi

# Determine source directory
if [ -d ".git" ] && [ -d "cazt-node" ] && [ -f "cazt-node/package.json" ]; then
  # Running from repo root
  SRC_DIR="$(pwd)/cazt-node"
  echo -e "${YELLOW}Installing from local directory...${NC}"
elif [ -f "package.json" ] && [ -d "cli" ]; then
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

# Navigate to source directory
cd "$SRC_DIR"

# Check package manager
if command -v yarn &> /dev/null; then
  PACKAGE_MANAGER="yarn"
else
  PACKAGE_MANAGER="npm"
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies with $PACKAGE_MANAGER...${NC}"
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
  yarn install
else
  npm install
fi

# Build
echo -e "${YELLOW}Building cazt...${NC}"
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
  yarn build
else
  npm run build
fi

# Install globally
echo -e "${YELLOW}Installing cazt globally...${NC}"
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
  yarn install-global
else
  npm install -g .
fi

echo -e "${GREEN}✓ cazt installed successfully!${NC}"
echo -e "${YELLOW}Note: You may need to restart your terminal or run:${NC}"
echo -e "${YELLOW}  source ~/.zshrc  (or ~/.bashrc)${NC}"
echo -e "${GREEN}Run 'cazt --help' to get started${NC}"