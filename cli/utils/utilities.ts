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
} from '@aztec/stdlib/hash';
import { keccak256, sha256ToField, poseidon2Hash } from '@aztec/foundation/crypto';
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
}

