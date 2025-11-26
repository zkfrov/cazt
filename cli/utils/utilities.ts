import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/foundation/fields';
import { 
  FunctionSelector, 
  EventSelector, 
  NoteSelector, 
  encodeArguments, 
  decodeFromAbi, 
  decodeFunctionSignature, 
  bufferAsFields,
  isAddressStruct,
  isEthAddressStruct,
  isAztecAddressStruct,
  isFunctionSelectorStruct,
  isWrappedFieldStruct,
  isBoundedVecStruct,
  loadContractArtifact,
  loadContractArtifactForPublic,
  contractArtifactToBuffer,
  contractArtifactFromBuffer,
} from '@aztec/stdlib/abi';
import { 
  hashVK, 
  computeNoteHashNonce, 
  siloNoteHash, 
  computeUniqueNoteHash, 
  siloPrivateLog, 
  computeVarArgsHash, 
  computeCalldataHash, 
  computeSecretHash, 
  siloNullifier, 
  computePublicDataTreeLeafSlot,
  computeL1ToL2MessageNullifier,
  computeL2ToL1MessageHash,
  deriveStorageSlotInMap,
} from '@aztec/stdlib/hash';
import { keccak256, sha256ToField, poseidon2Hash, poseidon2HashWithSeparator, pedersenHash } from '@aztec/foundation/crypto';
import { GeneratorIndex } from '@aztec/constants';
import { EthAddress } from '@aztec/foundation/eth-address';
import {
  computeArtifactHash,
  computeArtifactHashPreimage,
  computeArtifactMetadataHash,
  computeFunctionArtifactHash,
  computeFunctionMetadataHash,
  computeContractAddressFromInstance,
  computePartialAddress,
  computeSaltedInitializationHash,
  computeInitializationHash,
} from '@aztec/stdlib/contract';
import { computePreaddress, computeAddress } from '@aztec/stdlib/keys';
import { createAztecNodeClient, waitForNode } from '@aztec/aztec.js/node';
import { TestWallet } from '@aztec/test-wallet/server';
import { NoteStatus, Note } from '@aztec/stdlib/note';
import { Contract } from '@aztec/aztec.js/contracts';
import type { ContractArtifact } from '@aztec/stdlib/abi';
import type { Wallet } from '@aztec/aztec.js/wallet';
import { readdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export class AztecUtilities {
  // Hash utilities
  static async keccak(data: string): Promise<string> {
    const bytes = data.startsWith('0x') 
      ? Buffer.from(data.slice(2), 'hex')
      : Buffer.from(data, 'utf8');
    const result = keccak256(bytes);
    return result.toString('hex');
  }

  // Helper to convert string to Fr
  private static stringToFr(value: string): Fr {
    // Try to parse as hex first
    if (value.startsWith('0x')) {
      return new Fr(BigInt(value));
    }
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return new Fr(BigInt(value));
    }
    // Otherwise, treat as hex string without prefix
    try {
      return new Fr(BigInt(`0x${value}`));
    } catch {
      // If all else fails, convert to buffer, pad to 32 bytes, and use fromBuffer
      const buffer = Buffer.from(value, 'utf8');
      const padded = Buffer.alloc(32);
      buffer.copy(padded, 0, 0, Math.min(buffer.length, 32));
      return Fr.fromBuffer(padded);
    }
  }

  static async sha256(data: string): Promise<string> {
    let bytes: Buffer;
    if (data.startsWith('0x')) {
      bytes = Buffer.from(data.slice(2), 'hex');
    } else {
      bytes = Buffer.from(data, 'utf8');
    }
    // sha256ToField expects an array of Bufferable, so wrap in array
    const field = await sha256ToField([bytes]);
    return field.toString();
  }

  static async poseidon2(fields: string): Promise<string> {
    const fieldsArray = JSON.parse(fields);
    const frFields = fieldsArray.map((f: string) => this.stringToFr(f));
    const result = await poseidon2Hash(frFields);
    return result.toString();
  }

  /**
   * Compute Pedersen hash from input fields
   * @param params JSON string with: { inputs: string[], index?: number }
   * @returns Promise<string> - the computed Pedersen hash
   */
  static async computePedersenHash(params: string): Promise<string> {
    const p = JSON.parse(params);
    const inputs = p.inputs;
    const index = p.index || 0; // Optional hash index (default 0)

    if (!inputs || !Array.isArray(inputs)) {
      throw new Error('inputs must be a JSON array');
    }

    // Convert inputs to Fieldable[] (can be Fr, Buffer, string, etc.)
    const inputFields = inputs.map((item: string) => {
      // If it's a hex string, convert to Fr
      if (typeof item === 'string' && item.startsWith('0x')) {
        return this.stringToFr(item);
      }
      // If it's a number string, convert to Fr
      if (typeof item === 'string' && /^\d+$/.test(item)) {
        return new Fr(BigInt(item));
      }
      // Otherwise try to convert to Fr
      return this.stringToFr(item);
    });

    // Compute Pedersen hash
    const hash = await pedersenHash(inputFields, index);
    
    return hash.toString();
  }

  static async secretHash(secret: string): Promise<string> {
    const fr = this.stringToFr(secret);
    const result = await computeSecretHash(fr);
    return result.toString();
  }

  // Helper to normalize address (pad to 32 bytes if needed)
  private static normalizeAddress(address: string): string {
    if (address.startsWith('0x')) {
      const hex = address.slice(2);
      // Pad to 64 hex chars (32 bytes)
      return `0x${hex.padStart(64, '0')}`;
    }
    // If no 0x prefix, assume it's already hex and pad
    return `0x${address.padStart(64, '0')}`;
  }

  static async siloNullifier(contract: string, nullifier: string): Promise<string> {
    const normalizedContract = this.normalizeAddress(contract);
    const contractAddr = AztecAddress.fromString(normalizedContract);
    const nullifierFr = this.stringToFr(nullifier);
    const result = await siloNullifier(contractAddr, nullifierFr);
    return result.toString();
  }

  static async publicDataSlot(contract: string, slot: string): Promise<string> {
    const normalizedContract = this.normalizeAddress(contract);
    const contractAddr = AztecAddress.fromString(normalizedContract);
    const slotFr = this.stringToFr(slot);
    const result = await computePublicDataTreeLeafSlot(contractAddr, slotFr);
    return result.toString();
  }

  static async hashVK(fields: string): Promise<string> {
    const fieldsArray = JSON.parse(fields);
    const frFields = fieldsArray.map((f: string) => this.stringToFr(f));
    const result = await hashVK(frFields);
    return result.toString();
  }

  static async noteHashNonce(nullifierZero: string, index: number): Promise<string> {
    const nullifierFr = this.stringToFr(nullifierZero);
    const result = await computeNoteHashNonce(nullifierFr, index);
    return result.toString();
  }

  static async siloNoteHash(contract: string, noteHash: string): Promise<string> {
    const normalizedContract = this.normalizeAddress(contract);
    const contractAddr = AztecAddress.fromString(normalizedContract);
    const noteHashFr = this.stringToFr(noteHash);
    const result = await siloNoteHash(contractAddr, noteHashFr);
    return result.toString();
  }

  static async uniqueNoteHash(nonce: string, siloedNoteHash: string): Promise<string> {
    const nonceFr = this.stringToFr(nonce);
    const siloedFr = this.stringToFr(siloedNoteHash);
    const result = await computeUniqueNoteHash(nonceFr, siloedFr);
    return result.toString();
  }

  static async siloPrivateLog(contract: string, tag: string): Promise<string> {
    const contractAddr = AztecAddress.fromString(contract);
    const tagFr = this.stringToFr(tag);
    const result = await siloPrivateLog(contractAddr, tagFr);
    return result.toString();
  }

  static async varArgsHash(fields: string): Promise<string> {
    const fieldsArray = JSON.parse(fields);
    const frFields = fieldsArray.map((f: string) => this.stringToFr(f));
    const result = await computeVarArgsHash(frFields);
    return result.toString();
  }

  static async calldataHash(calldata: string): Promise<string> {
    const calldataArray = JSON.parse(calldata);
    const frFields = calldataArray.map((f: string) => this.stringToFr(f));
    const result = await computeCalldataHash(frFields);
    return result.toString();
  }

  static async l1ToL2MessageNullifier(contract: string, messageHash: string, secret: string): Promise<string> {
    const contractAddr = AztecAddress.fromString(contract);
    const messageHashFr = this.stringToFr(messageHash);
    const secretFr = this.stringToFr(secret);
    const result = await computeL1ToL2MessageNullifier(contractAddr, messageHashFr, secretFr);
    return result.toString();
  }

  static async l2ToL1MessageHash(params: string): Promise<string> {
    const p = JSON.parse(params);
    const result = await computeL2ToL1MessageHash({
      l2Sender: AztecAddress.fromString(p.l2Sender),
      l1Recipient: EthAddress.fromString(p.l1Recipient),
      content: this.stringToFr(p.content),
      rollupVersion: this.stringToFr(p.rollupVersion),
      chainId: this.stringToFr(p.chainId),
    });
    return result.toString();
  }

  // Address utilities
  static addressZero(): string {
    return AztecAddress.ZERO.toString();
  }

  static addressValidate(address: string): { valid: boolean; address?: string; error?: string } {
    try {
      const addr = AztecAddress.fromString(address);
      return { valid: true, address: addr.toString() };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }

  static async addressRandom(): Promise<string> {
    return (await AztecAddress.random()).toString();
  }

  static async addressIsValid(address: string): Promise<boolean> {
    const addr = AztecAddress.fromString(address);
    return await addr.isValid();
  }

  static async addressToPoint(address: string): Promise<{ x: string; y: string }> {
    const addr = AztecAddress.fromString(address);
    const point = await addr.toAddressPoint();
    return { x: point.x.toString(), y: point.y.toString() };
  }

  static addressFromField(field: string): string {
    const fr = this.stringToFr(field);
    return AztecAddress.fromField(fr).toString();
  }

  static addressFromBigInt(value: string): string {
    return AztecAddress.fromBigInt(BigInt(value)).toString();
  }

  static addressFromNumber(value: number): string {
    return AztecAddress.fromNumber(value).toString();
  }

  // Selector utilities
  static async selectorFromSignature(sig: string): Promise<string> {
    return (await FunctionSelector.fromSignature(sig)).toString();
  }

  static async selectorFromNameParams(params: string): Promise<string> {
    const p = JSON.parse(params);
    return (await FunctionSelector.fromNameAndParameters(p.name, p.parameters)).toString();
  }

  static selectorFromField(field: string): string {
    const fr = this.stringToFr(field);
    return FunctionSelector.fromField(fr).toString();
  }

  static selectorFromString(hex: string): string {
    return FunctionSelector.fromString(hex).toString();
  }

  static selectorEmpty(): string {
    return FunctionSelector.empty().toString();
  }

  static async eventSelector(sig: string): Promise<string> {
    return (await EventSelector.fromSignature(sig)).toString();
  }

  static async noteSelector(sig: string): Promise<string> {
    // NoteSelector doesn't have fromSignature, so we use FunctionSelector's approach
    // and convert to NoteSelector via fromField
    const funcSelector = await FunctionSelector.fromSignature(sig);
    const field = funcSelector.toField();
    return NoteSelector.fromField(field).toString();
  }

  // ABI utilities
  static abiEncode(params: string): any {
    const p = JSON.parse(params);
    return encodeArguments(p.abi, p.args);
  }

  static abiDecode(params: string): any {
    const p = JSON.parse(params);
    const fields = p.fields.map((f: string) => this.stringToFr(f));
    return decodeFromAbi(p.types, fields);
  }

  static decodeFunctionSignature(params: string): string {
    const p = JSON.parse(params);
    return decodeFunctionSignature(p.name, p.parameters);
  }

  // Field utilities
  static fieldFromString(value: string): string {
    return this.stringToFr(value).toString();
  }

  static fieldToString(field: string): string {
    return this.stringToFr(field).toString();
  }

  static fieldRandom(): string {
    return Fr.random().toString();
  }

  static fieldFromBuffer(buffer: string): string {
    const buf = Buffer.from(buffer, 'hex');
    return Fr.fromBuffer(buf).toString();
  }

  static fieldToBuffer(field: string): string {
    const fr = this.stringToFr(field);
    return fr.toBuffer().toString('hex');
  }

  static fieldFromBigInt(value: string): string {
    return new Fr(BigInt(value)).toString();
  }

  static fieldToBigInt(field: string): string {
    const fr = this.stringToFr(field);
    return fr.toBigInt().toString();
  }

  static fieldIsZero(field: string): boolean {
    return this.stringToFr(field).isZero();
  }

  static fieldEquals(field1: string, field2: string): boolean {
    return this.stringToFr(field1).equals(this.stringToFr(field2));
  }

  // Contract artifact utilities
  static async artifactHash(artifact: string): Promise<string> {
    const art = JSON.parse(artifact);
    const result = await computeArtifactHash(art);
    return result.toString();
  }

  static async artifactHashPreimage(artifact: string): Promise<any> {
    const art = JSON.parse(artifact);
    const preimage = await computeArtifactHashPreimage(art);
    return {
      privateFunctionRoot: preimage.privateFunctionRoot.toString(),
      utilityFunctionRoot: preimage.utilityFunctionRoot.toString(),
      metadataHash: preimage.metadataHash.toString(),
    };
  }

  static artifactMetadataHash(artifact: string): string {
    const art = JSON.parse(artifact);
    return computeArtifactMetadataHash(art).toString();
  }

  static async functionArtifactHash(function_: string): Promise<string> {
    const fn = JSON.parse(function_);
    const result = await computeFunctionArtifactHash(fn);
    return result.toString();
  }

  static functionMetadataHash(function_: string): string {
    const fn = JSON.parse(function_);
    return computeFunctionMetadataHash(fn).toString();
  }

  // Buffer utilities
  static bufferAsFields(params: string): string[] {
    const p = JSON.parse(params);
    const buffer = Buffer.from(p.buffer, 'hex');
    return bufferAsFields(buffer, p.targetLength).map((f: Fr) => f.toString());
  }

  // ABI type utilities
  static isAddressStruct(abiType: string): boolean {
    try {
      const type = JSON.parse(abiType);
      return isAddressStruct(type);
    } catch {
      return false;
    }
  }

  static isEthAddressStruct(abiType: string): boolean {
    try {
      const type = JSON.parse(abiType);
      return isEthAddressStruct(type);
    } catch {
      return false;
    }
  }

  static isAztecAddressStruct(abiType: string): boolean {
    try {
      const type = JSON.parse(abiType);
      return isAztecAddressStruct(type);
    } catch {
      return false;
    }
  }

  static isFunctionSelectorStruct(abiType: string): boolean {
    try {
      const type = JSON.parse(abiType);
      return isFunctionSelectorStruct(type);
    } catch {
      return false;
    }
  }

  static isWrappedFieldStruct(abiType: string): boolean {
    try {
      const type = JSON.parse(abiType);
      return isWrappedFieldStruct(type);
    } catch {
      return false;
    }
  }

  static isBoundedVecStruct(abiType: string): boolean {
    try {
      const type = JSON.parse(abiType);
      return isBoundedVecStruct(type);
    } catch {
      return false;
    }
  }

  // Contract artifact loading
  static loadContractArtifact(noirContract: string): any {
    const contract = JSON.parse(noirContract);
    return loadContractArtifact(contract);
  }

  static loadContractArtifactForPublic(noirContract: string): any {
    const contract = JSON.parse(noirContract);
    return loadContractArtifactForPublic(contract);
  }

  static contractArtifactToBuffer(artifact: string): string {
    const art = JSON.parse(artifact);
    return contractArtifactToBuffer(art).toString('hex');
  }

  static contractArtifactFromBuffer(buffer: string): any {
    const buf = Buffer.from(buffer, 'hex');
    return contractArtifactFromBuffer(buf);
  }

  // EthAddress utilities
  static ethAddressZero(): string {
    return EthAddress.ZERO.toString();
  }

  static async ethAddressRandom(): Promise<string> {
    return EthAddress.random().toString();
  }

  static ethAddressValidate(address: string): { valid: boolean; address?: string; error?: string } {
    try {
      const addr = EthAddress.fromString(address);
      return { valid: true, address: addr.toString() };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }

  static ethAddressFromField(field: string): string {
    const fr = this.stringToFr(field);
    return EthAddress.fromField(fr).toString();
  }

  static ethAddressToField(address: string): string {
    const addr = EthAddress.fromString(address);
    return addr.toField().toString();
  }

  static ethAddressIsZero(address: string): boolean {
    const addr = EthAddress.fromString(address);
    return addr.isZero();
  }

  // Address computation utilities
  static async computeContractAddress(instance: string): Promise<string> {
    const inst = JSON.parse(instance);
    // Convert string fields to Fr/AztecAddress as needed
    const convertedInstance = {
      ...inst,
      originalContractClassId: inst.originalContractClassId ? this.stringToFr(inst.originalContractClassId) : undefined,
      saltedInitializationHash: inst.saltedInitializationHash ? this.stringToFr(inst.saltedInitializationHash) : undefined,
      initializationHash: inst.initializationHash ? this.stringToFr(inst.initializationHash) : undefined,
      salt: inst.salt ? this.stringToFr(inst.salt) : undefined,
      deployer: inst.deployer ? AztecAddress.fromString(inst.deployer) : undefined,
      publicKeys: inst.publicKeys ? {
        ...inst.publicKeys,
        // Convert public key fields if needed
      } : undefined,
    };
    const result = await computeContractAddressFromInstance(convertedInstance as any);
    return result.toString();
  }

  static async computePartialAddress(instance: string): Promise<string> {
    const inst = JSON.parse(instance);
    const convertedInstance = {
      ...inst,
      originalContractClassId: inst.originalContractClassId ? this.stringToFr(inst.originalContractClassId) : undefined,
      saltedInitializationHash: inst.saltedInitializationHash ? this.stringToFr(inst.saltedInitializationHash) : undefined,
      initializationHash: inst.initializationHash ? this.stringToFr(inst.initializationHash) : undefined,
      salt: inst.salt ? this.stringToFr(inst.salt) : undefined,
      deployer: inst.deployer ? AztecAddress.fromString(inst.deployer) : undefined,
    };
    const result = await computePartialAddress(convertedInstance as any);
    return result.toString();
  }

  static async computePreaddress(params: string): Promise<string> {
    const p = JSON.parse(params);
    const publicKeysHash = this.stringToFr(p.publicKeysHash);
    const partialAddress = this.stringToFr(p.partialAddress);
    const result = await computePreaddress(publicKeysHash, partialAddress);
    return result.toString();
  }

  static async computeAddressFromKeys(params: string): Promise<string> {
    const p = JSON.parse(params);
    // This requires PublicKeys object which is complex, so we'll need the full object
    // For now, we'll require it to be passed as JSON
    const result = await computeAddress(p.publicKeys as any, this.stringToFr(p.partialAddress));
    return result.toString();
  }

  static async computeSaltedInitializationHash(params: string): Promise<string> {
    const p = JSON.parse(params);
    const converted = {
      initializationHash: this.stringToFr(p.initializationHash),
      salt: this.stringToFr(p.salt),
      deployer: AztecAddress.fromString(p.deployer),
    };
    const result = await computeSaltedInitializationHash(converted);
    return result.toString();
  }

  static async computeInitializationHash(params: string): Promise<string> {
    const p = JSON.parse(params);
    // initFn can be undefined, FunctionAbi, or we can pass it as JSON
    const initFn = p.initFn || undefined;
    const args = p.args || [];
    const result = await computeInitializationHash(initFn, args);
    return result.toString();
  }

  /**
   * Derive storage slot in a map
   * @param params - JSON string with:
   *   - baseSlot: string - Base storage slot (Fr)
   *   - key: string - Key for the map (can be AztecAddress or Fr)
   * @returns Derived storage slot
   */
  static async deriveNoteSlot(params: string): Promise<string> {
    const p = JSON.parse(params);
    const baseSlot = this.stringToFr(p.baseSlot);
    
    // Key can be an AztecAddress or a field
    let keyFr: Fr;
    try {
      // Try as AztecAddress first
      const keyAddress = AztecAddress.fromString(p.key);
      keyFr = keyAddress.toField();
    } catch {
      // If not an address, treat as field
      keyFr = this.stringToFr(p.key);
    }
    
    const result = await deriveStorageSlotInMap(baseSlot, { toField: () => keyFr });
    return result.toString();
  }

  /**
   * Get storage layout from contract artifact
   * @param params - JSON string with:
   *   - artifact: any - Contract artifact JSON (NoirCompiledContract)
   * @returns Storage layout information
   */
  static getStorageLayout(params: string): any {
    const p = JSON.parse(params);
    const artifactJson = p.artifact;
    
    if (!artifactJson) {
      throw new Error('artifact is required');
    }
    
    // Load the contract artifact
    let contractArtifact;
    try {
      contractArtifact = loadContractArtifact(artifactJson as any);
    } catch (error: any) {
      throw new Error(`Failed to load contract artifact: ${error.message}`);
    }
    
    if (!contractArtifact.storageLayout) {
      return {
        error: 'Contract artifact does not have storageLayout',
        artifactName: contractArtifact.name,
      };
    }
    
    // Format storage layout for output
    const layout: any = {};
    for (const [name, slotInfo] of Object.entries(contractArtifact.storageLayout)) {
      layout[name] = {
        slot: (slotInfo as any).slot?.toString(),
        typ: (slotInfo as any).typ,
      };
    }
    
    return {
      artifactName: contractArtifact.name,
      storageLayout: layout,
    };
  }

  /**
   * Get the package root directory (works in both dev and when installed)
   */
  private static getPackageRoot(): string {
    // Strategy 1: Start from current file location and walk up
    try {
      const currentFile = fileURLToPath(import.meta.url);
      let currentDir = dirname(currentFile);
      
      // Walk up from current directory to find package.json
      for (let i = 0; i < 10; i++) { // Max 10 levels up
        const packageJsonPath = join(currentDir, 'package.json');
        if (existsSync(packageJsonPath)) {
          return currentDir;
        }
        const parent = dirname(currentDir);
        if (parent === currentDir) break; // Reached filesystem root
        currentDir = parent;
      }
    } catch (error) {
      // Fall through to next strategy
    }
    
    // Strategy 2: Start from process.cwd() and walk up
    let current = process.cwd();
    for (let i = 0; i < 10; i++) { // Max 10 levels up
      const packageJsonPath = join(current, 'package.json');
      if (existsSync(packageJsonPath)) {
        return current;
      }
      const parent = dirname(current);
      if (parent === current) break; // Reached filesystem root
      current = parent;
    }
    
    // Fallback: return process.cwd() - assume we're in the package root
    return process.cwd();
  }

  /**
   * List available artifacts from a source
   * @param params - JSON string with:
   *   - source: string - Source name (e.g., "aztec", "standards")
   * @returns Array of artifact names
   */
  static listArtifacts(params: string): any {
    const p = JSON.parse(params);
    const source = p.source || 'aztec';
    const packageRoot = this.getPackageRoot();
    
    const artifacts: any[] = [];
    
    if (source === 'aztec') {
      // Look in node_modules/@aztec/noir-contracts.js/artifacts
      const artifactsPath = resolve(packageRoot, 'node_modules/@aztec/noir-contracts.js/artifacts');
      
      if (!existsSync(artifactsPath)) {
        throw new Error(`Artifacts directory not found: ${artifactsPath}`);
      }
      
      try {
        const files = readdirSync(artifactsPath);
        // Filter for .json files (not .d.json.ts files)
        const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.d.json.ts'));
        
        for (const file of jsonFiles) {
          // Extract contract name from filename (e.g., "token_contract-Token.json" -> "Token")
          const match = file.match(/(.+)-(.+)\.json$/);
          if (match) {
            const [, contractFile, contractName] = match;
            artifacts.push({
              name: contractName,
              file: file,
              fullName: `aztec:${contractName}`,
              path: join(artifactsPath, file),
            });
          }
        }
        
        // Sort by name
        artifacts.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error: any) {
        throw new Error(`Failed to read artifacts directory: ${error.message}`);
      }
    } else if (source === 'standards') {
      // Look in .aztec-standards/target (relative to package root)
      const artifactsPath = resolve(packageRoot, '.aztec-standards/target');
      
      if (!existsSync(artifactsPath)) {
        // Provide helpful error message
        const aztecStandardsDir = resolve(packageRoot, '.aztec-standards');
        let errorMsg = `Artifacts directory not found: ${artifactsPath}\n`;
        errorMsg += `Package root: ${packageRoot}\n`;
        
        if (existsSync(aztecStandardsDir)) {
          const subdirs = readdirSync(aztecStandardsDir);
          errorMsg += `.aztec-standards directory exists with subdirectories: ${subdirs.join(', ')}\n`;
        } else {
          errorMsg += `.aztec-standards directory does not exist.\n`;
        }
        
        errorMsg += `\nPlease run 'yarn build-aztec-standards' to build the artifacts.`;
        throw new Error(errorMsg);
      }
      
      try {
        const files = readdirSync(artifactsPath);
        // Filter for .json files (not .d.json.ts files)
        const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.d.json.ts'));
        
        if (jsonFiles.length === 0) {
          throw new Error(`No JSON artifacts found in ${artifactsPath}. Run 'yarn build-aztec-standards' to build the artifacts.`);
        }
        
        for (const file of jsonFiles) {
          // Extract contract name from filename
          // Could be "Token.json" or "token_contract-Token.json" format
          const match = file.match(/(.+)-(.+)\.json$/) || file.match(/(.+)\.json$/);
          if (match) {
            const contractName = match[2] || match[1]; // Use second group if available, else first
            artifacts.push({
              name: contractName,
              file: file,
              fullName: `standards:${contractName}`,
              path: join(artifactsPath, file),
            });
          }
        }
        
        // Sort by name
        artifacts.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error: any) {
        throw new Error(`Failed to read artifacts directory: ${error.message}`);
      }
    } else {
      throw new Error(`Unknown artifact source: ${source}. Supported sources: aztec, standards`);
    }
    
    return {
      source,
      artifacts,
      count: artifacts.length,
    };
  }

  /**
   * Resolve artifact path from name or path
   * @param artifactInput - Either a file path, @file.json, or artifact name like "aztec:Token" or "standards:Token"
   * @returns Path to the artifact file
   */
  static resolveArtifact(artifactInput: string): string {
    const packageRoot = this.getPackageRoot();
    
    // Check if it's an artifact name (format: "source:ContractName")
    if (artifactInput.includes(':') && !artifactInput.startsWith('@') && !artifactInput.includes('/') && !artifactInput.includes('\\')) {
      const [source, contractName] = artifactInput.split(':');
      
      if (source === 'aztec') {
        // Look for the artifact in node_modules
        const artifactsPath = resolve(packageRoot, 'node_modules/@aztec/noir-contracts.js/artifacts');
        
        try {
          const files = readdirSync(artifactsPath);
          // Search for file containing the contract name
          const matchingFile = files.find(f => 
            f.endsWith('.json') && 
            !f.endsWith('.d.json.ts') &&
            f.includes(contractName)
          );
          
          if (matchingFile) {
            return join(artifactsPath, matchingFile);
          }
          
          // If not found by name, try case-insensitive search
          const lowerContractName = contractName.toLowerCase();
          const caseInsensitiveMatch = files.find(f => 
            f.endsWith('.json') && 
            !f.endsWith('.d.json.ts') &&
            f.toLowerCase().includes(lowerContractName)
          );
          
          if (caseInsensitiveMatch) {
            return join(artifactsPath, caseInsensitiveMatch);
          }
          
          throw new Error(`Artifact "${contractName}" not found in ${source} artifacts`);
        } catch (error: any) {
          throw new Error(`Failed to resolve artifact "${artifactInput}": ${error.message}`);
        }
      } else if (source === 'standards') {
        // Look for the artifact in .aztec-standards/target
        const artifactsPath = resolve(packageRoot, '.aztec-standards/target');
        
        if (!existsSync(artifactsPath)) {
          throw new Error(`Artifacts directory not found: ${artifactsPath}. Run 'yarn build-aztec-standards' first.`);
        }
        
        try {
          const files = readdirSync(artifactsPath);
          // Search for file containing the contract name
          const matchingFile = files.find(f => 
            f.endsWith('.json') && 
            !f.endsWith('.d.json.ts') &&
            (f.includes(contractName) || f === `${contractName}.json`)
          );
          
          if (matchingFile) {
            return join(artifactsPath, matchingFile);
          }
          
          // If not found by name, try case-insensitive search
          const lowerContractName = contractName.toLowerCase();
          const caseInsensitiveMatch = files.find(f => 
            f.endsWith('.json') && 
            !f.endsWith('.d.json.ts') &&
            (f.toLowerCase().includes(lowerContractName) || f.toLowerCase() === `${lowerContractName}.json`)
          );
          
          if (caseInsensitiveMatch) {
            return join(artifactsPath, caseInsensitiveMatch);
          }
          
          throw new Error(`Artifact "${contractName}" not found in standards artifacts`);
        } catch (error: any) {
          throw new Error(`Failed to resolve artifact "${artifactInput}": ${error.message}`);
        }
      } else {
        throw new Error(`Unknown artifact source: ${source}`);
      }
    }
    
    // Otherwise, treat as file path (existing behavior)
    return artifactInput;
  }

  /**
   * Fetch notes from a wallet for a given storage slot
   * @param params - JSON string with:
   *   - nodeUrl?: string - Node URL (default: 'http://localhost:8080')
   *   - sender: string - Sender address (AztecAddress) - optional, used for scopes filtering
   *   - storageSlot?: string - Storage slot (Fr) - optional, can be a number or field
   *   - storageSlotName?: string - Storage slot name from artifact (e.g., "balances") - optional
   *   - storageSlotKey?: string - Key for deriving slot in map (e.g., user address) - optional, required if storageSlotName is provided
   *   - contractAddress: string - Contract address (required)
   *   - status?: string - Note status ('ACTIVE' | 'CANCELLED' | 'SETTLED') - optional, defaults to 'ACTIVE'
   *   - siloedNullifier?: string - Siloed nullifier (Fr) - optional
   *   - scopes?: string[] - Array of scope addresses - optional
   *   - artifact: any - Contract artifact JSON (NoirCompiledContract) - required
   *   - contractSecretKey?: string - Secret key (Fr) for contract registration (optional)
   *   - secretKeys?: string[] - Array of secret keys (Fr) for account creation - optional
   *   - salts?: string[] - Array of salts (Fr) for account creation - optional, defaults to Fr.ZERO for each
   *   - debug?: boolean - Enable debug logging (optional, defaults to false)
   * @returns Array of notes
   */
  static async fetchNotes(params: string): Promise<any> {
    const p = JSON.parse(params);
    const debug = p.debug || false;
    
    // Helper function for conditional debug logging
    const debugLog = (...args: any[]) => {
      if (debug) {
        console.log(...args);
      }
    };
    
    debugLog(`[DEBUG] Starting fetchNotes with params:`, {
      nodeUrl: p.nodeUrl || 'http://localhost:8080',
      hasSender: !!p.sender,
      hasContractAddress: !!p.contractAddress,
      hasArtifact: !!p.artifact,
      storageSlot: p.storageSlot,
      storageSlotName: p.storageSlotName,
      storageSlotKey: p.storageSlotKey,
      secretKeysCount: p.secretKeys?.length || (p.secretKey ? 1 : 0),
      saltsCount: p.salts?.length || (p.salt ? 1 : 0),
    });
    
    const nodeUrl = p.nodeUrl || 'http://localhost:8080';
    const senderAddress = p.sender ? AztecAddress.fromString(p.sender) : undefined;
    const contractAddress = p.contractAddress ? AztecAddress.fromString(p.contractAddress) : undefined;
    const artifactJson = p.artifact;
    const contractSecretKey = p.contractSecretKey ? this.stringToFr(p.contractSecretKey) : undefined;
    
    // Support both single and multiple secret keys
    const secretKeys: Fr[] = [];
    if (p.secretKeys && Array.isArray(p.secretKeys)) {
      secretKeys.push(...p.secretKeys.map((sk: string) => this.stringToFr(sk)));
      debugLog(`[DEBUG] Loaded ${secretKeys.length} secret keys from array`);
    } else if (p.secretKey) {
      // Backward compatibility: single secret key
      secretKeys.push(this.stringToFr(p.secretKey));
      debugLog(`[DEBUG] Loaded single secret key`);
    }
    
    // Support both single and multiple salts
    const salts: Fr[] = [];
    if (p.salts && Array.isArray(p.salts)) {
      salts.push(...p.salts.map((s: string) => this.stringToFr(s)));
      debugLog(`[DEBUG] Loaded ${salts.length} salts from array`);
    } else if (p.salt) {
      // Backward compatibility: single salt
      salts.push(this.stringToFr(p.salt));
      debugLog(`[DEBUG] Loaded single salt`);
    }
    
    const status = p.status || 'ACTIVE';
    const siloedNullifier = p.siloedNullifier ? this.stringToFr(p.siloedNullifier) : undefined;
    const scopes = p.scopes ? p.scopes.map((addr: string) => AztecAddress.fromString(addr)) : undefined;
    const storageSlotName = p.storageSlotName;
    const storageSlotKey = p.storageSlotKey;

    // Contract address is required for NotesFilter
    if (!contractAddress) {
      throw new Error('contractAddress is required');
    }
    debugLog(`[DEBUG] Contract address: ${contractAddress.toString()}`);

    // Artifact is required
    if (!artifactJson) {
      throw new Error('artifact is required (provide the Noir compiled contract JSON)');
    }
    debugLog(`[DEBUG] Artifact provided:`, typeof artifactJson === 'object' ? artifactJson.name || 'unnamed' : 'string/json');

    // Load the contract artifact from the JSON (NoirCompiledContract -> ContractArtifact)
    let contractArtifact;
    try {
      debugLog(`[DEBUG] Loading contract artifact...`);
      contractArtifact = loadContractArtifact(artifactJson as any);
      debugLog(`[DEBUG] Contract artifact loaded:`, {
        name: contractArtifact.name,
        hasStorageLayout: !!contractArtifact.storageLayout,
        storageLayoutKeys: contractArtifact.storageLayout ? Object.keys(contractArtifact.storageLayout) : [],
        functionsCount: contractArtifact.functions?.length || 0,
      });
    } catch (error: any) {
      throw new Error(`Failed to load contract artifact: ${error.message}`);
    }

    // Determine storage slot - either from direct value or from artifact name
    let storageSlot: Fr | undefined;
    
    if (p.storageSlot) {
      // Direct storage slot provided
      storageSlot = this.stringToFr(p.storageSlot);
      debugLog(`[DEBUG] Using direct storage slot: ${storageSlot.toString()}`);
    } else if (storageSlotName) {
      // Storage slot name provided - look it up in artifact
      debugLog(`[DEBUG] Looking up storage slot name: "${storageSlotName}"`);
      if (!contractArtifact.storageLayout) {
        throw new Error('Contract artifact does not have storageLayout');
      }
      
      const baseSlotInfo = contractArtifact.storageLayout[storageSlotName];
      if (!baseSlotInfo) {
        throw new Error(`Storage slot "${storageSlotName}" not found in contract artifact. Available slots: ${Object.keys(contractArtifact.storageLayout).join(', ')}`);
      }
      
      const baseSlot = baseSlotInfo.slot;
      debugLog(`[DEBUG] Found base slot for "${storageSlotName}": ${baseSlot.toString()}`);
      
      if (storageSlotKey) {
        // Derive slot for map with key using the utility function
        debugLog(`[DEBUG] Deriving slot with key: ${storageSlotKey}`);
        const keyFr = this.stringToFr(storageSlotKey);
        // Try as AztecAddress first, then as field
        let keyForDerivation: { toField: () => Fr };
        try {
          const keyAddress = AztecAddress.fromString(storageSlotKey);
          keyForDerivation = { toField: () => keyAddress.toField() };
          debugLog(`[DEBUG] Key interpreted as AztecAddress: ${keyAddress.toString()}`);
        } catch {
          keyForDerivation = { toField: () => keyFr };
          debugLog(`[DEBUG] Key interpreted as Field: ${keyFr.toString()}`);
        }
        
        storageSlot = await deriveStorageSlotInMap(baseSlot, keyForDerivation);
        debugLog(`[DEBUG] Derived storage slot: ${storageSlot.toString()}`);
      } else {
        // Use base slot directly
        storageSlot = baseSlot;
        debugLog(`[DEBUG] Using base slot directly: ${storageSlot.toString()}`);
      }
    } else {
      debugLog(`[DEBUG] No storage slot specified`);
    }

    // Create node client and wait for it to be ready
    debugLog(`[DEBUG] Creating node client for: ${nodeUrl}`);
    const node = createAztecNodeClient(nodeUrl);
    await waitForNode(node);
    debugLog(`[DEBUG] Node is ready`);

    // Create wallet using TestWallet
    debugLog(`[DEBUG] Creating TestWallet...`);
    const wallet = await TestWallet.create(node, {
      proverEnabled: false,
    });
    debugLog(`[DEBUG] Wallet created`);

    // Get PXE from wallet - TestWallet should have a pxe property
    const pxe = (wallet as any).pxe || (wallet as any).getPXE?.();
    if (!pxe) {
      throw new Error('Unable to access PXE from wallet');
    }
    debugLog(`[DEBUG] PXE accessed from wallet`);

    let contractInstance = await node.getContract(contractAddress);
    debugLog(`[DEBUG] Got contract instance from node:`, {
      address: contractInstance?.address.toString(),
    });
    await pxe.registerContract({ instance: contractInstance, artifact: contractArtifact });
    debugLog(`[DEBUG] Contract registered in PXE`);

    let accountManagers: any[] = [];
    
    // Register sender address if provided
    if (senderAddress) {
      debugLog(`[DEBUG] Registering sender address: ${senderAddress.toString()}`);
      await wallet.registerSender(senderAddress);
      debugLog(`[DEBUG] Sender address registered`);
    } else {
      debugLog(`[DEBUG] No sender address provided`);
    }

    // Create multiple accounts if secret keys are provided
    if (secretKeys.length > 0) {
      debugLog(`[DEBUG] Creating ${secretKeys.length} account(s)...`);
      
      for (let i = 0; i < secretKeys.length; i++) {
        const secretKey = secretKeys[i];
        // Use corresponding salt, or Fr.ZERO if not provided
        const saltToUse = i < salts.length ? salts[i] : Fr.ZERO;
        
        debugLog(`[DEBUG] Creating account ${i + 1}/${secretKeys.length}:`, {
          secretKey: secretKey.toString().substring(0, 20) + '...',
          salt: saltToUse.toString(),
        });
        const accountManager = await wallet.createSchnorrAccount(secretKey, saltToUse);
        accountManagers.push(accountManager);
        debugLog(`[DEBUG] Account ${i + 1} created:`, {
          address: accountManager.address.toString(),
        });
      }
    } else {
      debugLog(`[DEBUG] No secret keys provided for account creation`);
    }

    // Register the contract with the loaded artifact
    // contractSecretKey is optional - if not provided, contract will be registered without decryption key
    debugLog(`[DEBUG] Registering contract in wallet:`, {
      address: contractAddress.toString(),
      artifactName: contractArtifact.name || 'unknown',
      hasSecretKey: !!contractSecretKey,
    });

    try {
      // Get contract metadata to verify it exists
      debugLog(`[DEBUG] Checking contract metadata...`);
      const contractMetadata = await pxe.getContractMetadata(contractAddress);
      if (!contractMetadata) {
        throw new Error(`Contract not found at address ${contractAddress}`);
      }
      debugLog(`[DEBUG] Contract metadata:`, {
        isContractPublished: contractMetadata.isContractPublished,
        contractClassId: contractMetadata.contractClassId?.toString(),
      });

      // Register the contract with the loaded artifact and optional secret key
      await wallet.registerContract(
        contractAddress,
        contractArtifact,
        contractSecretKey || undefined
      );
      debugLog(`[DEBUG] Contract registered successfully in wallet`);
    } catch (error: any) {
      debugLog(`[DEBUG] Registration error:`, error.message);
      debugLog(`[DEBUG] Error stack:`, error.stack);
      // If registration fails, it might already be registered, so continue
      // Only throw if it's a critical error
      if (!error.message?.includes('already registered') && 
          !error.message?.includes('already exists') &&
          !error.message?.includes('has not been registered')) {
        throw new Error(`Failed to register contract: ${error.message}`);
      } else {
        debugLog(`[DEBUG] Contract may already be registered, continuing...`);
      }
    }

    // Determine scopes - combine provided scopes with all account manager addresses
    debugLog(`[DEBUG] Determining scopes...`);
    let finalScopes: AztecAddress[] = [];
    
    // Add provided scopes
    if (scopes && scopes.length > 0) {
      finalScopes.push(...scopes);
      debugLog(`[DEBUG] Added ${scopes.length} provided scope(s):`, scopes.map((a: AztecAddress) => a.toString()));
    }
    
    // Add all account manager addresses to scopes
    if (accountManagers.length > 0) {
      const accountAddresses = accountManagers.map(am => am.address);
      finalScopes.push(...accountAddresses);
      debugLog(`[DEBUG] Added ${accountManagers.length} account manager address(es) to scopes:`, accountAddresses.map((a: AztecAddress) => a.toString()));
    }
    
    // Remove duplicates
    const uniqueScopes = Array.from(new Set(finalScopes.map(addr => addr.toString())))
      .map(addrStr => AztecAddress.fromString(addrStr));
    
    if (uniqueScopes.length === 0) {
      debugLog(`[DEBUG] No scopes specified`);
    } else {
      debugLog(`[DEBUG] Final scopes (${uniqueScopes.length}):`, uniqueScopes.map(a => a.toString()));
    }

    // Build NotesFilter according to the type definition
    debugLog(`[DEBUG] Building notes filter...`);
    const notesFilter: any = {
      contractAddress: contractAddress,
    };

    // Add optional fields
    if (storageSlot) {
      notesFilter.storageSlot = storageSlot;
      debugLog(`[DEBUG] Storage slot in filter: ${storageSlot.toString()}`);
    }

    if (status) {
      notesFilter.status = NoteStatus[status as keyof typeof NoteStatus] || NoteStatus.ACTIVE;
      debugLog(`[DEBUG] Status in filter: ${status}`);
    }

    if (siloedNullifier) {
      notesFilter.siloedNullifier = siloedNullifier;
      debugLog(`[DEBUG] Siloed nullifier in filter: ${siloedNullifier.toString()}`);
    }

    if (uniqueScopes.length > 0) {
      notesFilter.scopes = uniqueScopes;
      debugLog(`[DEBUG] Scopes in filter (${uniqueScopes.length}):`, uniqueScopes.map(a => a.toString()));
    }

    // Get notes from PXE
    debugLog(`[DEBUG] Fetching notes with filter:`, JSON.stringify(notesFilter, (key, value) => {
      if (value && typeof value === 'object' && 'toField' in value) {
        return value.toString();
      }
      if (value && typeof value === 'object' && Array.isArray(value)) {
        return value.map(v => v.toString ? v.toString() : v);
      }
      return value;
    }, 2));
    
    const notes = await pxe.getNotes(notesFilter);

    debugLog(`[DEBUG] Found ${notes.length} note(s)`);

    // Deserialize notes - replace the "note" buffer with deserialized fields
    if (notes.length > 0) {
      debugLog(`[DEBUG] Deserializing ${notes.length} note(s)...`);
    
      const deserializedNotes = notes.map((note: any, index: number) => {
        try {
          debugLog(`[DEBUG] Processing note ${index + 1}/${notes.length}...`);
    
          const items = note.note?.items ?? [];
    
          debugLog(
            `[DEBUG] Note ${index + 1} deserialized, fields count: ${items.length}`,
          );
          debugLog(
            `[DEBUG] Note ${index + 1} fields:`,
            items.map((f: any) => f.toString()),
          );
    
          return {
            ...note,
            // replace the "note" property with plain strings
            note: items.map((f: any) => f.toString()),
          };
        } catch (error: any) {
          debugLog(
            `[DEBUG] Failed to deserialize note ${index + 1}:`,
            error.message,
          );
          debugLog(`[DEBUG] Error stack:`, error.stack);
          return {
            ...note,
            deserializeError: error.message,
          };
        }
      });
    
      debugLog(
        `[DEBUG] Successfully deserialized ${deserializedNotes.length} note(s)`,
      );
      return {
        notes: deserializedNotes,
      };
    } else {
      return {
        notes: [],
      };
    }
  }

  /**
   * Compute note hash(es) from note items and storage slot, or from existing hashes
   * Progressively computes raw, siloed, and unique hashes based on provided inputs
   * @param params JSON string with: { rawNoteHash?: string, siloedNoteHash?: string, noteItems?: string[], storageSlot?: string, partial?: boolean, contractAddress?: string, noteNonce?: string }
   * @returns Promise<string | object> - raw hash (string) if only items+slot, or object with all computed hashes
   */
  static async computeNoteHash(params: string): Promise<string | any> {
    const p = JSON.parse(params);
    const rawNoteHashInput = p.rawNoteHash;
    const siloedNoteHashInput = p.siloedNoteHash;
    const noteItems = p.noteItems;
    const storageSlot = p.storageSlot;
    const partial = p.partial || false;
    const contractAddress = p.contractAddress;
    const noteNonce = p.noteNonce;

    let rawNoteHash: Fr | undefined;
    let rawNoteHashStr: string | undefined;
    let siloedNoteHash: Fr | undefined;
    let siloedNoteHashStr: string | undefined;

    // Determine starting point
    if (siloedNoteHashInput) {
      // Start from siloed hash
      if (!contractAddress) {
        throw new Error('contractAddress is required when using siloedNoteHash');
      }
      siloedNoteHash = this.stringToFr(siloedNoteHashInput);
      siloedNoteHashStr = siloedNoteHashInput;
    } else if (rawNoteHashInput) {
      // Start from raw hash
      rawNoteHash = this.stringToFr(rawNoteHashInput);
      rawNoteHashStr = rawNoteHashInput;
    } else {
      // Compute from items
      if (!noteItems || !Array.isArray(noteItems)) {
        throw new Error('noteItems must be a JSON array when not using rawNoteHash or siloedNoteHash');
      }
      if (storageSlot === undefined || storageSlot === null) {
        throw new Error('storageSlot is required when computing from note items');
      }

      // Convert storage slot to Fr
      const storageSlotFr = this.stringToFr(storageSlot);

      if (partial) {
      // For partial notes, compute hash in 2 steps:
      // Step 1: commitment = hash([privateFields..., storageSlot], NOTE_HASH)
      // Step 2: final = hash([commitment, lastItem], NOTE_HASH)
      // The last item in noteItems is used for the second hash
      
      if (noteItems.length < 2) {
        throw new Error('partial note requires at least 2 note items (last item is used for the second hash)');
      }

      // Split: private items (all except last) and public value (last item)
      const privateItems = noteItems.slice(0, -1); // All except last
      const value = noteItems[noteItems.length - 1]; // Last item is used for the second hash

      // Convert to Fr[]
      const privateItemsFr = privateItems.map((item: string) => this.stringToFr(item));
      const valueFr = this.stringToFr(value);

      // Step 1: Compute partial commitment from private content + storage slot
      const commitmentInputs = [...privateItemsFr, storageSlotFr];
      const commitment = await poseidon2HashWithSeparator(
        commitmentInputs,
        GeneratorIndex.NOTE_HASH
      );

      // Step 2: Compute final note hash from commitment + value
      const finalInputs = [commitment, valueFr];
      rawNoteHash = await poseidon2HashWithSeparator(
        finalInputs,
        GeneratorIndex.NOTE_HASH
      );
      rawNoteHashStr = rawNoteHash.toString();
    } else {
      // Regular note: single step hash
      // Convert note items to Fr[]
      const noteItemsFr = noteItems.map((item: string) => this.stringToFr(item));
      
      // 1. Compute raw note hash: poseidon2HashWithSeparator([...note.items, storageSlot], GeneratorIndex.NOTE_HASH)
      const rawNoteHashInputs = [...noteItemsFr, storageSlotFr];
      rawNoteHash = await poseidon2HashWithSeparator(
        rawNoteHashInputs,
        GeneratorIndex.NOTE_HASH
      );
      rawNoteHashStr = rawNoteHash.toString();
      }
    }

    // 2. Compute siloed note hash if not already provided and contract is available
    if (!siloedNoteHash && contractAddress && rawNoteHash) {
      // Convert contract address string to Fr
      const normalizedContract = this.normalizeAddress(contractAddress);
      const contractAddr = AztecAddress.fromString(normalizedContract);
      const contractAddrFr = contractAddr.toField();
      
      const siloedInputs = [contractAddrFr, rawNoteHash];
      siloedNoteHash = await poseidon2HashWithSeparator(
        siloedInputs,
        GeneratorIndex.SILOED_NOTE_HASH
      );
      siloedNoteHashStr = siloedNoteHash.toString();
    }

    // If only raw hash and no contract/nonce, return just the raw hash
    if (rawNoteHashStr && !siloedNoteHashStr && !noteNonce) {
      return rawNoteHashStr;
    }

    // 3. Compute unique note hash: poseidon2HashWithSeparator([noteNonce, siloedNoteHash], GeneratorIndex.UNIQUE_NOTE_HASH)
    let uniqueNoteHash: Fr | undefined;
    let uniqueNoteHashStr: string | undefined;

    if (noteNonce) {
      if (!siloedNoteHash) {
        throw new Error('siloedNoteHash is required when computing unique hash (provide --contract to compute siloed hash, or --siloed-note-hash)');
      }
      const noteNonceFr = this.stringToFr(noteNonce);
      
      const uniqueInputs = [noteNonceFr, siloedNoteHash];
      uniqueNoteHash = await poseidon2HashWithSeparator(
        uniqueInputs,
        GeneratorIndex.UNIQUE_NOTE_HASH
      );
      uniqueNoteHashStr = uniqueNoteHash.toString();
    }

    // Return object with all computed hashes
    const result: any = {};

    if (rawNoteHashStr) {
      result.rawNoteHash = rawNoteHashStr;
    }

    if (siloedNoteHashStr) {
      result.siloedNoteHash = siloedNoteHashStr;
    }

    if (uniqueNoteHashStr) {
      result.uniqueNoteHash = uniqueNoteHashStr;
    }

    return result;
  }

  /**
   * Compute note hash from note content (legacy method, kept for verify command fallback)
   * @param params JSON string with: { artifact, noteContent, storageSlot }
   * @returns Promise<string> - the computed note hash
   */
  static async computeNoteHashFromContent(params: string): Promise<string> {
    const p = JSON.parse(params);
    const artifact = p.artifact;
    const noteContent = p.noteContent;
    const storageSlot = p.storageSlot;
    const noteTypeName = p.noteTypeName;

    if (!artifact) {
      throw new Error('artifact is required');
    }
    if (!noteContent) {
      throw new Error('noteContent is required');
    }
    if (storageSlot === undefined || storageSlot === null) {
      throw new Error('storageSlot is required');
    }

    // Find the note type definition in the artifact
    let noteAbi: any = null;
    
    // If noteTypeName is provided, try to find it in artifact.types
    if (noteTypeName && artifact.types && artifact.types[noteTypeName]) {
      noteAbi = artifact.types[noteTypeName];
    }
    
    // Try to find note type in artifact.notes
    if (!noteAbi && artifact.notes && Array.isArray(artifact.notes)) {
      // If storage slot is provided, try to match by storage slot
      const storageSlotFr = this.stringToFr(storageSlot);
      const matchingNote = artifact.notes.find((note: any) => {
        if (note.storageSlot !== undefined) {
          return this.stringToFr(note.storageSlot).equals(storageSlotFr);
        }
        return false;
      });
      if (matchingNote && matchingNote.type) {
        noteAbi = matchingNote.type;
      } else if (artifact.notes.length > 0 && artifact.notes[0].type) {
        // Fallback to first note type
        noteAbi = artifact.notes[0].type;
      }
    }

    // If not found in notes, try artifact.types
    if (!noteAbi && artifact.types) {
      // Look for struct types that might be notes
      const structTypes = Object.values(artifact.types).filter((t: any) => t.kind === 'struct');
      if (structTypes.length > 0) {
        // Use the first struct type as a fallback
        noteAbi = structTypes[0];
      }
    }

    if (!noteAbi) {
      throw new Error('Could not find note type definition in artifact. Please ensure the artifact contains note type definitions, or specify --note-type-name.');
    }

    // Encode the note content using the ABI encoder
    const noteFields = encodeArguments(noteAbi, [noteContent]);

    // Add storage slot
    const storageSlotFr = this.stringToFr(storageSlot);
    const inputs = [...noteFields, storageSlotFr];

    // Hash with the NOTE_HASH generator index
    const noteHash = await poseidon2HashWithSeparator(
      inputs,
      GeneratorIndex.NOTE_HASH
    );

    return noteHash.toString();
  }

  /**
   * Verify if a note exists in a transaction
   * @param params JSON string with: { txHash, noteHash?, contractAddress?, artifact?, noteContent?, storageSlot?, nodeUrl?, firstNullifier?, noteIndex?, noteTypeName? }
   * @returns Promise<{ exists: boolean, baseNoteHash: string, siloedHash: string, uniqueHash?: string, noteHashes: string[] }>
   */
  static async verifyNoteInTransaction(params: string): Promise<any> {
    const p = JSON.parse(params);
    const txHash = p.txHash;
    const noteHash = p.noteHash;
    const contractAddress = p.contractAddress;
    const artifact = p.artifact;
    const noteContent = p.noteContent;
    const storageSlot = p.storageSlot;
    const nodeUrl = p.nodeUrl || 'http://localhost:8080';
    const firstNullifier = p.firstNullifier;
    const noteIndex = p.noteIndex;

    if (!txHash) {
      throw new Error('txHash is required');
    }

    // 1. Get base note hash - either provided directly or compute from content
    let baseNoteHashStr: string;
    let baseNoteHash: Fr;
    
    if (noteHash) {
      // Use provided note hash directly
      baseNoteHashStr = noteHash;
      baseNoteHash = this.stringToFr(noteHash);
    } else {
      // Compute from note content
      if (!contractAddress) {
        throw new Error('contractAddress is required when computing hash from note content');
      }
      if (!artifact) {
        throw new Error('artifact is required when computing hash from note content');
      }
      if (!noteContent) {
        throw new Error('noteContent is required when computing hash from note content');
      }
      if (storageSlot === undefined || storageSlot === null) {
        throw new Error('storageSlot is required when computing hash from note content');
      }

      const computeHashParams: any = {
        artifact,
        noteContent,
        storageSlot,
      };
      if (p.noteTypeName) {
        computeHashParams.noteTypeName = p.noteTypeName;
      }
      baseNoteHashStr = await this.computeNoteHashFromContent(JSON.stringify(computeHashParams));
      baseNoteHash = this.stringToFr(baseNoteHashStr);
    }

    // 2. Silo it (if contract address is provided)
    let siloedHash: Fr;
    let siloedHashStr: string;
    
    if (contractAddress) {
      const normalizedContract = this.normalizeAddress(contractAddress);
      const contractAddr = AztecAddress.fromString(normalizedContract);
      siloedHash = await siloNoteHash(contractAddr, baseNoteHash);
      siloedHashStr = siloedHash.toString();
    } else {
      // If no contract address, use base hash as siloed hash (for comparison purposes)
      siloedHash = baseNoteHash;
      siloedHashStr = baseNoteHashStr;
    }

    // 3. Get transaction effects
    const aztecNode = createAztecNodeClient(nodeUrl);
    await waitForNode(aztecNode);
    const txEffect = await aztecNode.getTxEffect(txHash);
    
    if (!txEffect) {
      throw new Error(`Transaction ${txHash} not found`);
    }

    const noteHashes = txEffect.data.noteHashes || [];
    const noteHashesStr = noteHashes.map((h: Fr) => h.toString());

    // 4. If firstNullifier and noteIndex are provided, compute unique hash
    let uniqueHash: string | undefined;
    let exists = false;

    if (firstNullifier !== undefined && noteIndex !== undefined) {
      // Compute note hash nonce
      const firstNullifierFr = this.stringToFr(firstNullifier);
      const noteNonce = await computeNoteHashNonce(firstNullifierFr, parseInt(noteIndex));
      
      // Compute unique hash
      const uniqueHashFr = await computeUniqueNoteHash(noteNonce, siloedHash);
      uniqueHash = uniqueHashFr.toString();

      // Check if it exists
      exists = noteHashes.some((h: Fr) => h.equals(uniqueHashFr));
    } else {
      // Without unique hash, we can only check if the siloed hash matches any note hash
      // This is less precise but still useful
      exists = noteHashes.some((h: Fr) => h.equals(siloedHash));
    }

    // Try to get firstNullifier from txEffect if available
    let firstNullifierFromTx: string | undefined;
    if ('firstNullifier' in txEffect && txEffect.firstNullifier) {
      firstNullifierFromTx = (txEffect.firstNullifier as Fr).toString();
    } else if ('data' in txEffect && txEffect.data && 'firstNullifier' in txEffect.data) {
      firstNullifierFromTx = (txEffect.data as any).firstNullifier?.toString();
    }

    return {
      exists,
      baseNoteHash: baseNoteHashStr,
      siloedHash: siloedHashStr,
      uniqueHash,
      noteHashes: noteHashesStr,
      firstNullifier: firstNullifierFromTx,
      noteCount: noteHashes.length,
    };
  }

  /**
   * Deploy a contract
   * @param params - JSON string with:
   *   - nodeUrl?: string - Node URL (default: 'http://localhost:8080')
   *   - artifact: any - Contract artifact (required) - can be artifact name like "aztec:Token" or "standards:Token"
   *   - secretKey?: string - Secret key (Fr) for account creation (optional, will create account if provided)
   *   - salt?: string - Salt (Fr) for account creation (optional, defaults to Fr.ZERO)
   *   - deployer?: string - Deployer address (AztecAddress) - optional
   *   - contractAddressSalt?: string - Salt (Fr) for contract address computation - optional
   *   - universalDeploy?: boolean - Don't include sender in address computation - optional
   *   - constructorArgs?: any[] - Constructor arguments - optional
   *   - constructorName?: string - Constructor function name - optional
   *   - skipClassPublication?: boolean - Skip contract class publication - optional
   *   - skipInstancePublication?: boolean - Skip instance publication - optional
   *   - skipInitialization?: boolean - Skip contract initialization - optional
   *   - skipRegistration?: boolean - Skip contract registration in wallet - optional
   *   - wait?: boolean - Wait for deployment to complete - optional, defaults to true
   *   - debug?: boolean - Enable debug logging - optional
   * @returns Deployment result with contract address and receipt
   */
  static async deployContract(params: string): Promise<any> {
    const p = JSON.parse(params);
    const {
      nodeUrl = 'http://localhost:8080',
      artifact: artifactInput,
      secretKey,
      salt,
      deployer,
      contractAddressSalt,
      universalDeploy,
      constructorArgs = [],
      constructorName,
      skipClassPublication,
      skipInstancePublication,
      skipInitialization,
      skipRegistration,
      wait = true,
      debug = false,
    } = p;

    const debugLog = (msg: string, data?: any) => {
      if (debug) {
        console.error(`[DEBUG] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
      }
    };

    if (!artifactInput) {
      throw new Error('Artifact is required');
    }

    // Load artifact (supports aztec:, standards:, file paths, or JSON)
    debugLog(`[DEBUG] Loading artifact: ${typeof artifactInput === 'string' ? artifactInput : 'object'}`);
    let artifactJson: any;
    if (typeof artifactInput === 'string') {
      // Use parseJsonOrFile from rpc.ts logic
      const { parseJsonOrFile } = await import('./rpc.js');
      artifactJson = parseJsonOrFile(artifactInput);
    } else {
      artifactJson = artifactInput;
    }
    const contractArtifact = loadContractArtifact(artifactJson as any);
    debugLog(`[DEBUG] Artifact loaded:`, { name: contractArtifact.name });

    // Create node client and wait for it to be ready
    debugLog(`[DEBUG] Creating node client for: ${nodeUrl}`);
    const node = createAztecNodeClient(nodeUrl);
    await waitForNode(node);
    debugLog(`[DEBUG] Node is ready`);

    // Create wallet using TestWallet
    debugLog(`[DEBUG] Creating TestWallet...`);
    const wallet = await TestWallet.create(node, {
      proverEnabled: false,
    });
    debugLog(`[DEBUG] Wallet created`);

    // Create account if secret key is provided
    let accountManager: any = null;
    if (secretKey) {
      let saltToUse: Fr;
      if (salt) {
        if (salt === 'random' || salt.toLowerCase() === 'random') {
          saltToUse = Fr.random();
          debugLog(`[DEBUG] Generated random account salt: ${saltToUse.toString()}`);
        } else {
          saltToUse = Fr.fromString(salt);
        }
      } else {
        saltToUse = Fr.ZERO;
      }
      debugLog(`[DEBUG] Creating account with secret key...`);
      accountManager = await wallet.createSchnorrAccount(secretKey, saltToUse);
      debugLog(`[DEBUG] Account created:`, { address: accountManager.address.toString() });
    }

    // Prepare deployment options
    const deployOptions: any = {};

    if (contractAddressSalt !== undefined) {
      if (contractAddressSalt === 'random' || contractAddressSalt.toLowerCase() === 'random') {
        deployOptions.contractAddressSalt = Fr.random();
        debugLog(`[DEBUG] Generated random contract salt: ${deployOptions.contractAddressSalt.toString()}`);
      } else {
        deployOptions.contractAddressSalt = Fr.fromString(contractAddressSalt);
      }
    }

    if (deployer !== undefined) {
      deployOptions.deployer = AztecAddress.fromString(deployer);
    }

    if (universalDeploy !== undefined) {
      deployOptions.universalDeploy = universalDeploy;
    }

    if (skipClassPublication !== undefined) {
      deployOptions.skipClassPublication = skipClassPublication;
    }

    if (skipInstancePublication !== undefined) {
      deployOptions.skipInstancePublication = skipInstancePublication;
    }

    if (skipInitialization !== undefined) {
      deployOptions.skipInitialization = skipInitialization;
    }

    if (skipRegistration !== undefined) {
      deployOptions.skipRegistration = skipRegistration;
    }

    // Parse constructor args if provided as string
    let parsedConstructorArgs = constructorArgs;
    if (typeof constructorArgs === 'string') {
      try {
        parsedConstructorArgs = JSON.parse(constructorArgs);
      } catch {
        // If not JSON, treat as comma-separated values
        parsedConstructorArgs = constructorArgs.split(',').map((arg: string) => arg.trim());
      }
    }

    debugLog(`[DEBUG] Deploying contract with options:`, {
      constructorArgs: parsedConstructorArgs,
      constructorName,
      ...deployOptions,
    });

    // Deploy the contract
    const deployMethod = Contract.deploy(
      wallet,
      contractArtifact,
      parsedConstructorArgs,
      constructorName,
    );

    // Get instance to show address before deployment
    const instance = await deployMethod.getInstance(deployOptions);
    debugLog(`[DEBUG] Contract instance computed:`, {
      address: instance.address.toString(),
      contractClassId: instance.currentContractClassId.toString(),
    });

    // Send deployment transaction
    debugLog(`[DEBUG] Sending deployment transaction...`);
    const deployTx = deployMethod.send(deployOptions);
    const txHash = await deployTx.getTxHash();
    debugLog(`[DEBUG] Deployment transaction sent:`, { txHash: txHash.toString() });

    let receipt: any = null;
    let contract: any = null;

    if (wait) {
      debugLog(`[DEBUG] Waiting for deployment to complete...`);
      const deployReceipt = await deployTx.wait();
      receipt = {
        txHash: deployReceipt.txHash.toString(),
        status: deployReceipt.status,
        blockNumber: deployReceipt.blockNumber,
      };
      // Access instance from receipt (DeployTxReceipt has instance property)
      const receiptInstance = (deployReceipt as any).instance;
      contract = {
        address: deployReceipt.contract.address.toString(),
        instance: {
          address: receiptInstance.address.toString(),
          contractClassId: receiptInstance.currentContractClassId.toString(),
          initializationHash: receiptInstance.initializationHash.toString(),
          salt: receiptInstance.salt.toString(),
        },
      };
      debugLog(`[DEBUG] Deployment completed:`, contract);
    } else {
      // Return instance info even if not waiting
      contract = {
        address: instance.address.toString(),
        instance: {
          address: instance.address.toString(),
          contractClassId: instance.currentContractClassId.toString(),
          initializationHash: instance.initializationHash.toString(),
          salt: instance.salt.toString(),
        },
      };
    }

    return {
      txHash: txHash.toString(),
      contract,
      receipt,
      account: accountManager ? {
        address: accountManager.address.toString(),
      } : null,
    };
  }
}
