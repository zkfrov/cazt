#!/usr/bin/env tsx

/**
 * Simple test script for cazt CLI
 * Run with: npx tsx cli/test.ts
 */

import { AztecUtilities } from './utils/utilities.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

interface Test {
  name: string;
  fn: () => Promise<void> | void;
}

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  process.stdout.write(`Testing ${name}... `);
  try {
    await fn();
    console.log(`${GREEN}✓${RESET}`);
    passed++;
  } catch (error: any) {
    console.log(`${RED}✗${RESET}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertMatches(value: string, pattern: string | RegExp, message?: string): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  if (!regex.test(value)) {
    throw new Error(message || `Expected value to match ${pattern}, got: ${value}`);
  }
}

async function runTests(): Promise<void> {
  console.log('🧪 Testing cazt CLI utilities...\n');

  // Address utilities
  await test('address-zero', () => {
    const result = AztecUtilities.addressZero();
    assertMatches(result, /^0x0+$/, 'Should return zero address');
  });

  await test('address-random', async () => {
    const result = await AztecUtilities.addressRandom();
    assertMatches(result, /^0x[0-9a-f]{64}$/i, 'Should return valid address');
  });

  await test('address-validate (valid)', () => {
    const result = AztecUtilities.addressValidate('0x0000000000000000000000000000000000000000000000000000000000000000');
    assert(result.valid === true, 'Should validate as valid');
  });

  await test('address-validate (invalid)', () => {
    const result = AztecUtilities.addressValidate('invalid');
    assert(result.valid === false, 'Should validate as invalid');
  });

  // Hash utilities
  await test('keccak', async () => {
    const result = await AztecUtilities.keccak('test');
    assertMatches(result, /^[0-9a-f]+$/i, 'Should return hex string');
    assert(result.length > 0, 'Should return non-empty result');
  });

  await test('sha256', async () => {
    const result = await AztecUtilities.sha256('test');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
  });

  await test('field-random', () => {
    const result = AztecUtilities.fieldRandom();
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
  });

  await test('secret-hash', async () => {
    const result = await AztecUtilities.secretHash('0x1234');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
  });

  // Selector utilities
  await test('selector from signature', async () => {
    const result = await AztecUtilities.selectorFromSignature('transfer(address,uint256)');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex selector');
  });

  await test('event-selector', async () => {
    const result = await AztecUtilities.eventSelector('Transfer(address,uint256)');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex selector');
  });

  await test('note-selector', async () => {
    const result = await AztecUtilities.noteSelector('transfer(address,uint256)');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex selector');
  });

  // Field utilities
  await test('field-from-string', () => {
    const result = AztecUtilities.fieldFromString('123');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
  });

  await test('field-is-zero', () => {
    const result = AztecUtilities.fieldIsZero('0x0000000000000000000000000000000000000000000000000000000000000000');
    assert(result === true, 'Should return true for zero field');
  });

  await test('field-equals', () => {
    const result = AztecUtilities.fieldEquals('0x1', '0x1');
    assert(result === true, 'Should return true for equal fields');
    const result2 = AztecUtilities.fieldEquals('0x1', '0x2');
    assert(result2 === false, 'Should return false for different fields');
  });

  // EthAddress utilities
  await test('eth-address-zero', () => {
    const result = AztecUtilities.ethAddressZero();
    assert(result === '0x0000000000000000000000000000000000000000', 'Should return zero address');
  });

  await test('eth-address-random', async () => {
    const result = await AztecUtilities.ethAddressRandom();
    assertMatches(result, /^0x[0-9a-f]{40}$/i, 'Should return valid Ethereum address');
  });

  await test('eth-address-validate', () => {
    const result = AztecUtilities.ethAddressValidate('0x0000000000000000000000000000000000000000');
    assert(result.valid === true, 'Should validate as valid');
  });

  await test('eth-address-is-zero', () => {
    const result = AztecUtilities.ethAddressIsZero('0x0000000000000000000000000000000000000000');
    assert(result === true, 'Should return true for zero address');
  });

  await test('eth-address-from-field', () => {
    const result = AztecUtilities.ethAddressFromField('0x1');
    assertMatches(result, /^0x[0-9a-f]{40}$/i, 'Should return valid Ethereum address');
  });

  await test('eth-address-to-field', () => {
    const result = AztecUtilities.ethAddressToField('0x0000000000000000000000000000000000000001');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return field value');
  });

  // Poseidon2 hash
  await test('poseidon2', async () => {
    const result = await AztecUtilities.poseidon2('["0x1","0x2"]');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
  });

  // Address computation (simple test)
  await test('compute-preaddress', async () => {
    const params = JSON.stringify({
      publicKeysHash: '0x1',
      partialAddress: '0x2',
    });
    const result = await AztecUtilities.computePreaddress(params);
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
  });

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`${GREEN}Passed: ${passed}${RESET}`);
  if (failed > 0) {
    console.log(`${RED}Failed: ${failed}${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}Failed: ${failed}${RESET}`);
    console.log(`\n${GREEN}✅ All tests passed!${RESET}`);
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error(`${RED}Test runner error:${RESET}`, error);
  process.exit(1);
});

