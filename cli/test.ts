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

  await test('keccak UTF-8 input (1)', async () => {
    const result = await AztecUtilities.keccak('1');
    assertMatches(result, /^[0-9a-f]+$/i, 'Should return hex string');
    // Expected from cast: 0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6
    assert(result === 'c89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6', 
      `Expected c89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6, got ${result}`);
  });

  await test('keccak hex input even digits (0x01)', async () => {
    const result = await AztecUtilities.keccak('0x01');
    assertMatches(result, /^[0-9a-f]+$/i, 'Should return hex string');
    // Expected from cast: 0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2
    assert(result === '5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2', 
      `Expected 5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2, got ${result}`);
  });

  await test('keccak hex input odd digits (0x1) should error', async () => {
    try {
      await AztecUtilities.keccak('0x1');
      throw new Error('Should have thrown error for odd number of digits');
    } catch (error: any) {
      assert(error.message === 'odd number of digits', 
        `Expected "odd number of digits" error, got: ${error.message}`);
    }
  });

  await test('keccak UTF-8 with letters', async () => {
    const result = await AztecUtilities.keccak('hello');
    assertMatches(result, /^[0-9a-f]+$/i, 'Should return hex string');
    assert(result.length === 64, 'Should return 64 hex characters (32 bytes)');
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
    const result = AztecUtilities.fieldEquals('0x01', '0x01');
    assert(result === true, 'Should return true for equal fields');
    const result2 = AztecUtilities.fieldEquals('0x01', '0x02');
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
    const result = AztecUtilities.ethAddressFromField('0x01');
    assertMatches(result, /^0x[0-9a-f]{40}$/i, 'Should return valid Ethereum address');
  });

  await test('eth-address-to-field', () => {
    const result = AztecUtilities.ethAddressToField('0x0000000000000000000000000000000000000001');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return field value');
  });

  // Poseidon2 hash
  await test('poseidon2', async () => {
    const result = await AztecUtilities.poseidon2('["0x01","0x02"]');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
  });

  await test('poseidon2 with UTF-8 inputs (4,8)', async () => {
    const result = await AztecUtilities.poseidon2('["4","8"]');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
    // "4" and "8" are treated as UTF-8 strings (ASCII characters), not numbers
    assert(result.length === 66, 'Should return 66-character hex string (0x + 64 hex chars)');
  });

  await test('poseidon2 with even-length hex inputs (0x04,0x08)', async () => {
    const result = await AztecUtilities.poseidon2('["0x04","0x08"]');
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
    // Expected result from user's test: 0x2bcaeb6d58bb38baf753d58c3c96618fea82163345295eb40e88344eeb0ce2a1
    assert(result === '0x2bcaeb6d58bb38baf753d58c3c96618fea82163345295eb40e88344eeb0ce2a1', 
      `Expected 0x2bcaeb6d58bb38baf753d58c3c96618fea82163345295eb40e88344eeb0ce2a1, got ${result}`);
    // UTF-8 inputs should produce different result than hex inputs
    const result2 = await AztecUtilities.poseidon2('["4","8"]');
    assert(result !== result2, 'UTF-8 inputs (4,8) should NOT match hex inputs (0x04,0x08)');
  });

  await test('poseidon2 with odd-length hex input should error', async () => {
    try {
      await AztecUtilities.poseidon2('["0x1","0x2"]');
      throw new Error('Should have thrown error for odd number of digits');
    } catch (error: any) {
      assert(error.message === 'odd number of digits', 
        `Expected "odd number of digits" error, got: ${error.message}`);
    }
  });

  // Pedersen hash
  await test('pedersen with hex inputs (0x01,0x01)', async () => {
    const params = JSON.stringify({
      inputs: ['0x01', '0x01'],
      index: 0,
    });
    const result = await AztecUtilities.computePedersenHash(params);
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
    // Expected result from user's test: 0x07ebfbf4df29888c6cd6dca13d4bb9d1a923013ddbbcbdc3378ab8845463297b
    assert(result === '0x07ebfbf4df29888c6cd6dca13d4bb9d1a923013ddbbcbdc3378ab8845463297b', 
      `Expected 0x07ebfbf4df29888c6cd6dca13d4bb9d1a923013ddbbcbdc3378ab8845463297b, got ${result}`);
  });

  await test('pedersen with hex inputs (0x01,0x01) index 5', async () => {
    const params = JSON.stringify({
      inputs: ['0x01', '0x01'],
      index: 5,
    });
    const result = await AztecUtilities.computePedersenHash(params);
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
    // Expected result from user's test: 0x1c446df60816b897cda124524e6b03f36df0cec333fad87617aab70d7861daa6
    assert(result === '0x1c446df60816b897cda124524e6b03f36df0cec333fad87617aab70d7861daa6', 
      `Expected 0x1c446df60816b897cda124524e6b03f36df0cec333fad87617aab70d7861daa6, got ${result}`);
  });

  await test('pedersen with hex inputs (0x04,0x08) index 7', async () => {
    const params = JSON.stringify({
      inputs: ['0x04', '0x08'],
      index: 7,
    });
    const result = await AztecUtilities.computePedersenHash(params);
    assertMatches(result, /^0x[0-9a-f]+$/i, 'Should return hex string');
    // Expected result from user's test: 0x04c2352a060d4ac1cdfb603ebc4327b5764597231614f61d245bf35772c08696
    assert(result === '0x04c2352a060d4ac1cdfb603ebc4327b5764597231614f61d245bf35772c08696', 
      `Expected 0x04c2352a060d4ac1cdfb603ebc4327b5764597231614f61d245bf35772c08696, got ${result}`);
  });

  await test('pedersen UTF-8 inputs should differ from hex inputs', async () => {
    const paramsHex = JSON.stringify({
      inputs: ['0x01', '0x01'],
      index: 0,
    });
    const resultHex = await AztecUtilities.computePedersenHash(paramsHex);
    
    const paramsUtf8 = JSON.stringify({
      inputs: ['1', '1'],
      index: 0,
    });
    const resultUtf8 = await AztecUtilities.computePedersenHash(paramsUtf8);
    
    // UTF-8 inputs ("1","1") should NOT match hex inputs (0x01,0x01)
    assert(resultHex !== resultUtf8, 'UTF-8 inputs (1,1) should NOT match hex inputs (0x01,0x01)');
  });

  await test('pedersen with odd-length hex input should error', async () => {
    try {
      const params = JSON.stringify({
        inputs: ['0x1', '0x1'],
        index: 0,
      });
      await AztecUtilities.computePedersenHash(params);
      throw new Error('Should have thrown error for odd number of digits');
    } catch (error: any) {
      assert(error.message === 'odd number of digits', 
        `Expected "odd number of digits" error, got: ${error.message}`);
    }
  });

  // Address computation (simple test)
  await test('compute-preaddress', async () => {
    const params = JSON.stringify({
      publicKeysHash: '0x01',
      partialAddress: '0x02',
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

