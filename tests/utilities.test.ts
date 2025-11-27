import { AztecUtilities } from '../cli/utils/index.js';

describe('AztecUtilities', () => {
  describe('Address utilities', () => {
    it('should return zero address', () => {
      const result = AztecUtilities.addressZero();
      expect(result).toMatch(/^0x0+$/);
    });

    it('should return random address', async () => {
      const result = await AztecUtilities.addressRandom();
      expect(result).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it('should validate valid address', () => {
      const result = AztecUtilities.addressValidate('0x0000000000000000000000000000000000000000000000000000000000000000');
      expect(result.valid).toBe(true);
    });

    it('should validate invalid address', () => {
      const result = AztecUtilities.addressValidate('invalid');
      expect(result.valid).toBe(false);
    });
  });

  describe('Hash utilities', () => {
    it('should compute keccak hash', async () => {
      const result = await AztecUtilities.keccak('test');
      expect(result).toMatch(/^[0-9a-f]+$/i);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should compute keccak hash for UTF-8 input (1)', async () => {
      const result = await AztecUtilities.keccak('1');
      expect(result).toMatch(/^[0-9a-f]+$/i);
      // Expected from cast: 0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6
      expect(result).toBe('c89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6');
    });

    it('should compute keccak hash for hex input even digits (0x01)', async () => {
      const result = await AztecUtilities.keccak('0x01');
      expect(result).toMatch(/^[0-9a-f]+$/i);
      // Expected from cast: 0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2
      expect(result).toBe('5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2');
    });

    it('should error on keccak hex input with odd digits (0x1)', async () => {
      await expect(AztecUtilities.keccak('0x1')).rejects.toThrow('odd number of digits');
    });

    it('should compute keccak hash for UTF-8 with letters', async () => {
      const result = await AztecUtilities.keccak('hello');
      expect(result).toMatch(/^[0-9a-f]+$/i);
      expect(result.length).toBe(64);
    });

    it('should compute sha256 hash', async () => {
      const result = await AztecUtilities.sha256('test');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });

    it('should return random field', () => {
      const result = AztecUtilities.fieldRandom();
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });

    it('should compute secret hash', async () => {
      const result = await AztecUtilities.secretHash('0x1234');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });
  });

  describe('Selector utilities', () => {
    it('should compute selector from signature', async () => {
      const result = await AztecUtilities.selectorFromSignature('transfer(address,uint256)');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });

    it('should compute event selector', async () => {
      const result = await AztecUtilities.eventSelector('Transfer(address,uint256)');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });

    it('should compute note selector', async () => {
      const result = await AztecUtilities.noteSelector('transfer(address,uint256)');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });
  });

  describe('Field utilities', () => {
    it('should convert string to field', () => {
      const result = AztecUtilities.fieldFromString('123');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });

    it('should check if field is zero', () => {
      const result = AztecUtilities.fieldIsZero('0x0000000000000000000000000000000000000000000000000000000000000000');
      expect(result).toBe(true);
    });

    it('should check field equality', () => {
      const result = AztecUtilities.fieldEquals('0x01', '0x01');
      expect(result).toBe(true);
      const result2 = AztecUtilities.fieldEquals('0x01', '0x02');
      expect(result2).toBe(false);
    });
  });

  describe('EthAddress utilities', () => {
    it('should return zero Ethereum address', () => {
      const result = AztecUtilities.ethAddressZero();
      expect(result).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should return random Ethereum address', async () => {
      const result = await AztecUtilities.ethAddressRandom();
      expect(result).toMatch(/^0x[0-9a-f]{40}$/i);
    });

    it('should validate Ethereum address', () => {
      const result = AztecUtilities.ethAddressValidate('0x0000000000000000000000000000000000000000');
      expect(result.valid).toBe(true);
    });

    it('should check if Ethereum address is zero', () => {
      const result = AztecUtilities.ethAddressIsZero('0x0000000000000000000000000000000000000000');
      expect(result).toBe(true);
    });

    it('should convert field to Ethereum address', () => {
      const result = AztecUtilities.ethAddressFromField('0x01');
      expect(result).toMatch(/^0x[0-9a-f]{40}$/i);
    });

    it('should convert Ethereum address to field', () => {
      const result = AztecUtilities.ethAddressToField('0x0000000000000000000000000000000000000001');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });
  });

  describe('Poseidon2 hash', () => {
    it('should compute poseidon2 hash', async () => {
      const result = await AztecUtilities.poseidon2('["0x01","0x02"]');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });

    it('should compute poseidon2 with UTF-8 inputs (4,8)', async () => {
      const result = await AztecUtilities.poseidon2('["4","8"]');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
      // "4" and "8" are treated as UTF-8 strings (ASCII characters), not numbers
      expect(result.length).toBe(66);
    });

    it('should compute poseidon2 with even-length hex inputs (0x04,0x08)', async () => {
      const result = await AztecUtilities.poseidon2('["0x04","0x08"]');
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
      // Expected result from user's test: 0x2bcaeb6d58bb38baf753d58c3c96618fea82163345295eb40e88344eeb0ce2a1
      expect(result).toBe('0x2bcaeb6d58bb38baf753d58c3c96618fea82163345295eb40e88344eeb0ce2a1');
      // UTF-8 inputs should produce different result than hex inputs
      const result2 = await AztecUtilities.poseidon2('["4","8"]');
      expect(result).not.toBe(result2);
    });

    it('should error on poseidon2 with odd-length hex input', async () => {
      await expect(AztecUtilities.poseidon2('["0x1","0x2"]')).rejects.toThrow('odd number of digits');
    });
  });

  describe('Pedersen hash', () => {
    it('should compute pedersen hash with hex inputs (0x01,0x01)', async () => {
      const params = JSON.stringify({
        inputs: ['0x01', '0x01'],
        index: 0,
      });
      const result = await AztecUtilities.computePedersenHash(params);
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
      // Expected result from user's test: 0x07ebfbf4df29888c6cd6dca13d4bb9d1a923013ddbbcbdc3378ab8845463297b
      expect(result).toBe('0x07ebfbf4df29888c6cd6dca13d4bb9d1a923013ddbbcbdc3378ab8845463297b');
    });

    it('should compute pedersen hash with hex inputs (0x01,0x01) index 5', async () => {
      const params = JSON.stringify({
        inputs: ['0x01', '0x01'],
        index: 5,
      });
      const result = await AztecUtilities.computePedersenHash(params);
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
      // Expected result from user's test: 0x1c446df60816b897cda124524e6b03f36df0cec333fad87617aab70d7861daa6
      expect(result).toBe('0x1c446df60816b897cda124524e6b03f36df0cec333fad87617aab70d7861daa6');
    });

    it('should compute pedersen hash with hex inputs (0x04,0x08) index 7', async () => {
      const params = JSON.stringify({
        inputs: ['0x04', '0x08'],
        index: 7,
      });
      const result = await AztecUtilities.computePedersenHash(params);
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
      // Expected result from user's test: 0x04c2352a060d4ac1cdfb603ebc4327b5764597231614f61d245bf35772c08696
      expect(result).toBe('0x04c2352a060d4ac1cdfb603ebc4327b5764597231614f61d245bf35772c08696');
    });

    it('should produce different results for UTF-8 vs hex inputs', async () => {
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
      expect(resultHex).not.toBe(resultUtf8);
    });

    it('should error on pedersen hash with odd-length hex input', async () => {
      const params = JSON.stringify({
        inputs: ['0x1', '0x1'],
        index: 0,
      });
      await expect(AztecUtilities.computePedersenHash(params)).rejects.toThrow('odd number of digits');
    });
  });

  describe('Address computation', () => {
    it('should compute preaddress', async () => {
      const params = JSON.stringify({
        publicKeysHash: '0x01',
        partialAddress: '0x02',
      });
      const result = await AztecUtilities.computePreaddress(params);
      expect(result).toMatch(/^0x[0-9a-f]+$/i);
    });
  });
});

