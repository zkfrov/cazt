#!/usr/bin/env node

import { Command } from 'commander';
import { RpcClient, parseJsonOrFile } from './utils/rpc.js';
import { AztecUtilities } from './utils/utilities.js';
import * as readline from 'readline';
import { readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const program = new Command();

program
  .name('cazt')
  .description('cast-like CLI for Aztec Node JSON-RPC')
  .version('3.0.0-devnet.2')
  .option('--rpc-url <url>', 'Aztec node RPC url', process.env.CAZT_RPC_URL || 'http://localhost:8080')
  .option('--admin-url <url>', 'Aztec admin RPC url', process.env.CAZT_ADMIN_URL || 'http://localhost:8880')
  .option('--no-pretty', 'Print compact JSON', false)
  .option('--json', 'Output as JSON (default: raw value for utilities)', false);

// Raw RPC command
program
  .command('raw')
  .description('Generic raw JSON-RPC call')
  .requiredOption('--method <method>', 'Method name: node_* or nodeAdmin_*')
  .option('--params <params>', 'JSON array for params', '[]')
  .action(async (options) => {
    const client = new RpcClient({
      rpcUrl: program.opts().rpcUrl,
      adminUrl: program.opts().adminUrl,
      pretty: !program.opts().noPretty,
    });
    const params = parseJsonOrFile(options.params);
    const result = await client.call(options.method, params);
    console.log(client.formatOutput(result, !program.opts().noPretty));
  });

// Block commands
const blockCmd = program.command('block').description('Block queries');
blockCmd.command('number').description('Get current block number').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getBlockNumber', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
blockCmd.command('proven-number').description('Get proven block number').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getProvenBlockNumber', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
blockCmd.command('tips').description('Get L2 tips').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getL2Tips', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
blockCmd.command('get').description('Get block by number').requiredOption('--number <number>', 'Block number').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getBlock', [options.number]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
blockCmd.command('range').description('Get blocks range').requiredOption('--from <from>', 'From block').requiredOption('--limit <limit>', 'Limit').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getBlocks', [parseInt(options.from), parseInt(options.limit)]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
blockCmd.command('header').description('Get block header').option('--number <number>', 'Block number').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const params = options.number ? [options.number] : [];
  const result = await client.call('node_getBlockHeader', params);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Transaction commands
const txCmd = program.command('tx').description('Transactions');
txCmd.command('send').description('Send transaction').requiredOption('--json <json>', 'JSON object or @file.json').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const tx = parseJsonOrFile(options.json);
  const result = await client.call('node_sendTx', [tx]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
txCmd.command('receipt').description('Get transaction receipt').requiredOption('--hash <hash>', 'Transaction hash').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getTxReceipt', [options.hash]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
txCmd.command('effect').description('Get transaction effect').requiredOption('--hash <hash>', 'Transaction hash').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getTxEffect', [options.hash]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
txCmd.command('get').description('Get transaction by hash').requiredOption('--hash <hash>', 'Transaction hash').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getTxByHash', [options.hash]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
txCmd.command('pending').description('Get pending transactions').option('--limit <limit>', 'Limit').option('--after <after>', 'After hash').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const params = [
    options.limit ? parseInt(options.limit) : null,
    options.after || null,
  ];
  const result = await client.call('node_getPendingTxs', params);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
txCmd.command('pending-count').description('Get pending transaction count').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getPendingTxCount', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
txCmd.command('validate').description('Validate transaction').requiredOption('--json <json>', 'tx JSON or @file.json').option('--options <options>', 'JSON options', 'null').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const tx = parseJsonOrFile(options.json);
  const opts = parseJsonOrFile(options.options);
  const result = await client.call('node_isValidTx', [tx, opts]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
txCmd.command('sim-public').description('Simulate public calls').requiredOption('--json <json>', 'tx JSON or @file.json').option('--skip-fee-enforcement', 'Skip fee enforcement').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const tx = parseJsonOrFile(options.json);
  const result = await client.call('node_simulatePublicCalls', [tx, options.skipFeeEnforcement || null]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// State commands
const stateCmd = program.command('state').description('State queries');
stateCmd.command('public-at').description('Get public storage at').requiredOption('--block <block>', 'Block').requiredOption('--contract <contract>', 'Contract address').requiredOption('--slot <slot>', 'Storage slot').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getPublicStorageAt', [options.block, options.contract, options.slot]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
stateCmd.command('sync-status').description('Get world state sync status').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getWorldStateSyncStatus', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Merkle commands
const merkleCmd = program.command('merkle').description('Merkle tree queries');
merkleCmd.command('find-leaves').description('Find leaves indexes').requiredOption('--block <block>', 'Block').requiredOption('--tree-id <treeId>', 'Tree ID').requiredOption('--leaves <leaves>', 'JSON array or @file.json').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const leaves = parseJsonOrFile(options.leaves);
  const result = await client.call('node_findLeavesIndexes', [options.block, parseInt(options.treeId), leaves]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
merkleCmd.command('nullifier-path').description('Get nullifier sibling path').requiredOption('--block <block>', 'Block').requiredOption('--index <index>', 'Index').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getNullifierSiblingPath', [options.block, options.index]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
merkleCmd.command('note-hash-path').description('Get note hash sibling path').requiredOption('--block <block>', 'Block').requiredOption('--index <index>', 'Index').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getNoteHashSiblingPath', [options.block, options.index]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
merkleCmd.command('archive-path').description('Get archive sibling path').requiredOption('--block <block>', 'Block').requiredOption('--index <index>', 'Index').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getArchiveSiblingPath', [options.block, options.index]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
merkleCmd.command('public-data-path').description('Get public data sibling path').requiredOption('--block <block>', 'Block').requiredOption('--index <index>', 'Index').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getPublicDataSiblingPath', [options.block, options.index]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Witness commands
const witnessCmd = program.command('witness').description('Membership witnesses');
witnessCmd.command('nullifier').description('Get nullifier membership witness').requiredOption('--block <block>', 'Block').requiredOption('--nullifier <nullifier>', 'Nullifier').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getNullifierMembershipWitness', [options.block, options.nullifier]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
witnessCmd.command('low-nullifier').description('Get low nullifier membership witness').requiredOption('--block <block>', 'Block').requiredOption('--nullifier <nullifier>', 'Nullifier').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getLowNullifierMembershipWitness', [options.block, options.nullifier]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
witnessCmd.command('public-data').description('Get public data witness').requiredOption('--block <block>', 'Block').requiredOption('--leaf-slot <leafSlot>', 'Leaf slot').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getPublicDataWitness', [options.block, options.leafSlot]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
witnessCmd.command('archive').description('Get archive membership witness').requiredOption('--block <block>', 'Block').requiredOption('--archive-leaf <archiveLeaf>', 'Archive leaf').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getArchiveMembershipWitness', [options.block, options.archiveLeaf]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
witnessCmd.command('note-hash').description('Get note hash membership witness').requiredOption('--block <block>', 'Block').requiredOption('--note-hash <noteHash>', 'Note hash').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getNoteHashMembershipWitness', [options.block, options.noteHash]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Bridge commands
const bridgeCmd = program.command('bridge').description('L1<->L2 messages');
bridgeCmd.command('l1-to-l2-witness').description('Get L1->L2 message membership witness').requiredOption('--block <block>', 'Block').requiredOption('--message <message>', 'Message').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getL1ToL2MessageMembershipWitness', [options.block, options.message]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
bridgeCmd.command('l1-to-l2-block').description('Get L1->L2 message block').requiredOption('--message <message>', 'Message').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getL1ToL2MessageBlock', [options.message]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
bridgeCmd.command('is-l1-to-l2-synced').description('Check if L1->L2 message is synced').requiredOption('--message <message>', 'Message').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_isL1ToL2MessageSynced', [options.message]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
bridgeCmd.command('l2-to-l1').description('Get L2->L1 messages').requiredOption('--block <block>', 'Block').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getL2ToL1Messages', [options.block]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Logs commands
const logsCmd = program.command('logs').description('Logs');
logsCmd.command('private').description('Get private logs').requiredOption('--from <from>', 'From block').requiredOption('--limit <limit>', 'Limit').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getPrivateLogs', [parseInt(options.from), parseInt(options.limit)]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
logsCmd.command('public').description('Get public logs').requiredOption('--filter <filter>', 'filter JSON or @file.json').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const filter = parseJsonOrFile(options.filter);
  const result = await client.call('node_getPublicLogs', [filter]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
logsCmd.command('contract-class').description('Get contract class logs').requiredOption('--filter <filter>', 'filter JSON or @file.json').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const filter = parseJsonOrFile(options.filter);
  const result = await client.call('node_getContractClassLogs', [filter]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
logsCmd.command('by-tags').description('Get logs by tags').requiredOption('--tags <tags>', 'JSON array or @file.json').option('--logs-per-tag <logsPerTag>', 'Logs per tag').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const tags = parseJsonOrFile(options.tags);
  const params = [tags];
  if (options.logsPerTag) params.push(parseInt(options.logsPerTag));
  const result = await client.call('node_getLogsByTags', params);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Notes commands
const notesCmd = program.command('notes').description('Note queries');
notesCmd
  .command('fetch')
  .description('Fetch notes from wallet for a storage slot')
  .requiredOption('--contract <address>', 'Contract address (required)')
  .requiredOption('--artifact <json>', 'Contract artifact JSON file path, artifact name (e.g., "aztec:Token"), or JSON string (required)')
  .option('--contract-secret-key <key>', 'Secret key (Fr) for contract registration (optional)')
  .option('--sender <sender>', 'Sender address (AztecAddress) - required for scopes filtering, will be registered with wallet')
  .option('--storage-slot <slot>', 'Storage slot (Fr) - optional, can be a number or field value')
  .option('--storage-slot-name <name>', 'Storage slot name from artifact (e.g., "balances") - optional, alternative to --storage-slot')
  .option('--storage-slot-key <key>', 'Key for deriving slot in map (e.g., user address) - optional, required if --storage-slot-name is provided for map slots')
  .option('--secret-key <key>', 'Secret key (Fr) for account creation - can be provided multiple times or comma-separated')
  .option('--secret-keys <keys>', 'Comma-separated list of secret keys (Fr) for account creation - alternative to multiple --secret-key')
  .option('--salt <salt>', 'Salt (Fr) for account creation - can be provided multiple times or comma-separated (defaults to 0 if not provided)')
  .option('--salts <salts>', 'Comma-separated list of salts (Fr) for account creation - alternative to multiple --salt (defaults to 0 if not provided)')
  .option('--status <status>', 'Note status (ACTIVE | CANCELLED | SETTLED)', 'ACTIVE')
  .option('--siloed-nullifier <nullifier>', 'Siloed nullifier (Fr) - optional')
  .option('--scopes <addresses>', 'Comma-separated list of scope addresses - optional')
  .option('--node-url <url>', 'Node URL', process.env.CAZT_RPC_URL || 'http://localhost:8080')
  .option('--debug', 'Enable debug logging', false)
  .action(async (options) => {
    const params: any = {
      contractAddress: options.contract,
      nodeUrl: options.nodeUrl,
      debug: options.debug || false,
    };
    
    // Artifact is required
    params.artifact = parseJsonOrFile(options.artifact);
    
    if (options.sender) {
      params.sender = options.sender;
    }

    // Storage slot options
    if (options.storageSlot) {
      params.storageSlot = options.storageSlot;
    }

    if (options.storageSlotName) {
      params.storageSlotName = options.storageSlotName;
    }

    if (options.storageSlotKey) {
      params.storageSlotKey = options.storageSlotKey;
    }

    // Handle multiple secret keys
    const secretKeys: string[] = [];
    if (options.secretKeys) {
      // Comma-separated list
      secretKeys.push(...options.secretKeys.split(',').map((s: string) => s.trim()));
    }
    // Commander allows multiple --secret-key flags, they come as an array
    if (options.secretKey) {
      if (Array.isArray(options.secretKey)) {
        secretKeys.push(...options.secretKey);
      } else {
        secretKeys.push(options.secretKey);
      }
    }
    if (secretKeys.length > 0) {
      params.secretKeys = secretKeys;
    }

    // Handle multiple salts
    const salts: string[] = [];
    if (options.salts) {
      // Comma-separated list
      salts.push(...options.salts.split(',').map((s: string) => s.trim()));
    }
    // Commander allows multiple --salt flags, they come as an array
    if (options.salt) {
      if (Array.isArray(options.salt)) {
        salts.push(...options.salt);
      } else {
        salts.push(options.salt);
      }
    }
    if (salts.length > 0) {
      params.salts = salts;
    }

    // Validate that if sender is provided, we should have secret keys for account creation
    if (options.sender && secretKeys.length === 0) {
      console.warn('Warning: Sender address provided but secret-key(s) are missing. Account creation will be skipped.');
    }

    if (options.contractSecretKey) {
      params.contractSecretKey = options.contractSecretKey;
    }

    try {
      const result = await AztecUtilities.fetchNotes(JSON.stringify(params));
      console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
    } catch (error: any) {
      console.error(`Error fetching notes: ${error.message}`);
      process.exit(1);
    }
  });

// Artifacts commands
const artifactsCmd = program.command('artifacts').description('List available contract artifacts');
artifactsCmd
  .command('aztec')
  .description('List all available Aztec contract artifacts')
  .option('--full', 'Show full artifact details (default: show names only)', false)
  .action(async (options) => {
    try {
      const result = AztecUtilities.listArtifacts(JSON.stringify({ source: 'aztec' }));
      
      if (options.full) {
        console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
      } else {
        if (result.artifacts && Array.isArray(result.artifacts)) {
          result.artifacts.forEach((artifact: any) => {
            console.log(artifact.name);
          });
        }
      }
    } catch (error: any) {
      console.error(`Error listing artifacts: ${error.message}`);
      process.exit(1);
    }
  });

artifactsCmd
  .command('standards')
  .description('List all available Aztec Standards contract artifacts')
  .option('--full', 'Show full artifact details (default: show names only)', false)
  .action(async (options) => {
    try {
      const result = AztecUtilities.listArtifacts(JSON.stringify({ source: 'standards' }));
      
      if (options.full) {
        console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
      } else {
        if (result.artifacts && Array.isArray(result.artifacts)) {
          result.artifacts.forEach((artifact: any) => {
            console.log(artifact.name);
          });
        }
      }
    } catch (error: any) {
      console.error(`Error listing artifacts: ${error.message}`);
      process.exit(1);
    }
  });

// Note slot utility
program
  .command('note-slot')
  .description('Derive storage slot in a map')
  .requiredOption('--base-slot <slot>', 'Base storage slot (Fr)')
  .requiredOption('--key <key>', 'Key for the map (AztecAddress or Fr)')
  .action(async (options) => {
    const params = JSON.stringify({
      baseSlot: options.baseSlot,
      key: options.key,
    });
    
    try {
      const result = await AztecUtilities.deriveNoteSlot(params);
      outputResult(result, program.opts().json);
    } catch (error: any) {
      console.error(`Error deriving note slot: ${error.message}`);
      process.exit(1);
    }
  });

// Storage layout command
program
  .command('storage-layout')
  .description('Get storage layout from contract artifact')
  .requiredOption('--artifact <json>', 'Contract artifact JSON file path or JSON string (required)')
  .action(async (options) => {
    const artifact = parseJsonOrFile(options.artifact);
    const params = JSON.stringify({ artifact });
    
    try {
      const result = AztecUtilities.getStorageLayout(params);
      console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
    } catch (error: any) {
      console.error(`Error getting storage layout: ${error.message}`);
      process.exit(1);
    }
  });

// Contract commands
const contractCmd = program.command('contract').description('Contract queries');
contractCmd.command('class').description('Get contract class').requiredOption('--id <id>', 'Class ID').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getContractClass', [options.id]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
contractCmd.command('get').description('Get contract').argument('<address>', 'Contract address').action(async (address) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getContract', [address]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Node commands
const nodeCmd = program.command('node').description('Node info & fees');
nodeCmd.command('ready').description('Check if node is ready').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_isReady', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('info').description('Get node info').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getNodeInfo', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('node-version').description('Get node version').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getNodeVersion', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('version').description('Get version').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getVersion', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('chain-id').description('Get chain ID').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getChainId', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('l1-addresses').description('Get L1 contract addresses').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getL1ContractAddresses', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('protocol-addresses').description('Get protocol contract addresses').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getProtocolContractAddresses', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('enr').description('Get encoded ENR').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getEncodedEnr', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
nodeCmd.command('base-fees').description('Get current base fees').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getCurrentBaseFees', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Validators commands
const validatorsCmd = program.command('validators').description('Validators');
validatorsCmd.command('stats').description('Get validators stats').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getValidatorsStats', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
validatorsCmd.command('one').description('Get validator stats').requiredOption('--address <address>', 'Validator address').option('--from-slot <fromSlot>', 'From slot').option('--to-slot <toSlot>', 'To slot').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const params = [options.address];
  if (options.fromSlot) params.push(options.fromSlot);
  if (options.toSlot) params.push(options.toSlot);
  const result = await client.call('node_getValidatorStats', params);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Debug commands
const debugCmd = program.command('debug').description('Debug helpers');
debugCmd.command('register-sigs').description('Register contract function signatures').requiredOption('--sigs <sigs>', 'JSON array or @file.json').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const sigs = parseJsonOrFile(options.sigs);
  const result = await client.call('node_registerContractFunctionSignatures', [sigs]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
debugCmd.command('allowed-public-setup').description('Get allowed public setup').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('node_getAllowedPublicSetup', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Admin commands
const adminCmd = program.command('admin').description('Admin namespace (port 8880)');
adminCmd.command('get-config').description('Get admin config').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('nodeAdmin_getConfig', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
adminCmd.command('set-config').description('Set admin config').requiredOption('--json <json>', 'partial config JSON or @file.json').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const config = parseJsonOrFile(options.json);
  const result = await client.call('nodeAdmin_setConfig', [config]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
adminCmd.command('pause-sync').description('Pause sync').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('nodeAdmin_pauseSync', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
adminCmd.command('resume-sync').description('Resume sync').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('nodeAdmin_resumeSync', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
adminCmd.command('rollback-to').description('Rollback to block').requiredOption('--target-block-number <number>', 'Target block number').option('--force', 'Force rollback').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const params = [parseInt(options.targetBlockNumber), options.force || null];
  const result = await client.call('nodeAdmin_rollbackTo', params);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
adminCmd.command('start-snapshot-upload').description('Start snapshot upload').requiredOption('--location <location>', 'Location').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('nodeAdmin_startSnapshotUpload', [options.location]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
adminCmd.command('get-slash-payloads').description('Get slash payloads').action(async () => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('nodeAdmin_getSlashPayloads', []);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});
adminCmd.command('get-slash-offenses').description('Get slash offenses').option('--round <round>', 'Round', 'current').action(async (options) => {
  const client = new RpcClient({ rpcUrl: program.opts().rpcUrl, adminUrl: program.opts().adminUrl, pretty: !program.opts().noPretty });
  const result = await client.call('nodeAdmin_getSlashOffenses', [options.round]);
  console.log(client.formatOutput(result, !program.opts().noPretty));
});

// Helper to output raw or JSON
function outputResult(value: string | any, json: boolean = false): void {
  if (json) {
    const output = typeof value === 'string' ? { value } : value;
    console.log(JSON.stringify(output, null, program.opts().noPretty ? 0 : 2));
  } else {
    console.log(value);
  }
}

// Utility commands (flat, like cast)
program.command('address-zero').alias('az').description('Prints the zero address').action(async () => {
  const result = AztecUtilities.addressZero();
  outputResult(result, program.opts().json);
});

program.command('hash-zero').alias('hz').description('Prints the zero hash').action(async () => {
  const result = '0x0000000000000000000000000000000000000000000000000000000000000000';
  outputResult(result, program.opts().json);
});

program.command('keccak').alias('k').description('Keccak-256 hash').argument('[data]', 'The data to hash').action(async (data) => {
  const input = data || await readStdin();
  const result = await AztecUtilities.keccak(input);
  outputResult(`0x${result}`, program.opts().json);
});

program.command('sha256').description('SHA-256 hash (Aztec standard)').argument('[data]', 'The data to hash').action(async (data) => {
  const input = data || await readStdin();
  const result = await AztecUtilities.sha256(input);
  outputResult(result, program.opts().json);
});

program.command('poseidon2').description('Poseidon2 hash').argument('<fields>', 'JSON array of field values').action(async (fields: string) => {
  const result = await AztecUtilities.poseidon2(fields);
  outputResult(result, program.opts().json);
});

program.command('secret-hash').description('Compute secret hash').argument('<secret>', 'The secret value').action(async (secret: string) => {
  const result = await AztecUtilities.secretHash(secret);
  outputResult(result, program.opts().json);
});

program.command('silo-nullifier').description('Silo a nullifier with contract address').requiredOption('--contract <contract>', 'Contract address').requiredOption('--nullifier <nullifier>', 'Nullifier value').action(async (options) => {
  const result = await AztecUtilities.siloNullifier(options.contract, options.nullifier);
  outputResult(result, program.opts().json);
});

program.command('public-data-slot').description('Compute public data tree leaf slot').requiredOption('--contract <contract>', 'Contract address').requiredOption('--slot <slot>', 'Storage slot').action(async (options) => {
  const result = await AztecUtilities.publicDataSlot(options.contract, options.slot);
  outputResult(result, program.opts().json);
});

program.command('address-validate').description('Validate Aztec address format').argument('<address>', 'Address to validate').action(async (address: string) => {
  const result = AztecUtilities.addressValidate(address);
  // This returns an object, so always output as JSON
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('sig').alias('selector').alias('si').description('Compute function selector from signature').argument('[sig]', 'Function signature').action(async (sig) => {
  const input = sig || await readStdin();
  const result = await AztecUtilities.selectorFromSignature(input);
  outputResult(result, program.opts().json);
});

program.command('field-from-string').description('Convert string to field element').argument('<value>', 'String value to convert').action(async (value: string) => {
  const result = AztecUtilities.fieldFromString(value);
  outputResult(result, program.opts().json);
});

program.command('field-to-string').description('Convert field element to string').argument('<field>', 'Field value to convert').action(async (field: string) => {
  const result = AztecUtilities.fieldToString(field);
  outputResult(result, program.opts().json);
});

// Additional hash utilities
program.command('hash-vk').description('Hash verification key').argument('<fields>', 'JSON array of field values').action(async (fields: string) => {
  const result = await AztecUtilities.hashVK(fields);
  outputResult(result, program.opts().json);
});

program.command('note-hash-nonce').description('Compute note hash nonce').requiredOption('--nullifier-zero <nullifierZero>', 'Nullifier zero').requiredOption('--index <index>', 'Note hash index').action(async (options) => {
  const result = await AztecUtilities.noteHashNonce(options.nullifierZero, parseInt(options.index));
  outputResult(result, program.opts().json);
});

program.command('silo-note-hash').description('Silo note hash to contract').requiredOption('--contract <contract>', 'Contract address').requiredOption('--note-hash <noteHash>', 'Note hash').action(async (options) => {
  const result = await AztecUtilities.siloNoteHash(options.contract, options.noteHash);
  outputResult(result, program.opts().json);
});

program.command('unique-note-hash').description('Compute unique note hash').requiredOption('--nonce <nonce>', 'Note nonce').requiredOption('--siloed-note-hash <siloedNoteHash>', 'Siloed note hash').action(async (options) => {
  const result = await AztecUtilities.uniqueNoteHash(options.nonce, options.siloedNoteHash);
  outputResult(result, program.opts().json);
});

program.command('silo-private-log').description('Silo private log tag').requiredOption('--contract <contract>', 'Contract address').requiredOption('--tag <tag>', 'Unsiloed tag').action(async (options) => {
  const result = await AztecUtilities.siloPrivateLog(options.contract, options.tag);
  outputResult(result, program.opts().json);
});

program.command('var-args-hash').description('Hash function arguments (for authwit)').argument('<fields>', 'JSON array of field values').action(async (fields: string) => {
  const result = await AztecUtilities.varArgsHash(fields);
  outputResult(result, program.opts().json);
});

program.command('calldata-hash').description('Hash public function calldata').argument('<calldata>', 'JSON array of calldata fields').action(async (calldata: string) => {
  const result = await AztecUtilities.calldataHash(calldata);
  outputResult(result, program.opts().json);
});

program.command('l1-to-l2-message-nullifier').description('Compute L1->L2 message nullifier').requiredOption('--contract <contract>', 'Contract address').requiredOption('--message-hash <messageHash>', 'Message hash').requiredOption('--secret <secret>', 'Secret').action(async (options) => {
  const result = await AztecUtilities.l1ToL2MessageNullifier(options.contract, options.messageHash, options.secret);
  outputResult(result, program.opts().json);
});

program.command('l2-to-l1-message-hash').description('Compute L2->L1 message hash').argument('<params>', 'JSON object with l2Sender, l1Recipient, content, rollupVersion, chainId').action(async (params: string) => {
  const result = await AztecUtilities.l2ToL1MessageHash(params);
  outputResult(result, program.opts().json);
});

// Additional address utilities
program.command('address-random').description('Generate random valid Aztec address').action(async () => {
  const result = await AztecUtilities.addressRandom();
  outputResult(result, program.opts().json);
});

program.command('address-is-valid').description('Check if address is valid').argument('<address>', 'Address to check').action(async (address: string) => {
  const result = await AztecUtilities.addressIsValid(address);
  // Boolean output - output as true/false string
  outputResult(result.toString(), program.opts().json);
});

program.command('address-to-point').description('Convert address to Grumpkin point').argument('<address>', 'Address to convert').action(async (address: string) => {
  const result = await AztecUtilities.addressToPoint(address);
  // Object output - always JSON
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('address-from-field').description('Create address from field').argument('<field>', 'Field value').action(async (field: string) => {
  const result = AztecUtilities.addressFromField(field);
  outputResult(result, program.opts().json);
});

program.command('address-from-bigint').description('Create address from bigint').argument('<value>', 'BigInt value').action(async (value: string) => {
  const result = AztecUtilities.addressFromBigInt(value);
  outputResult(result, program.opts().json);
});

program.command('address-from-number').description('Create address from number').argument('<value>', 'Number value').action(async (value: string) => {
  const result = AztecUtilities.addressFromNumber(parseInt(value));
  outputResult(result, program.opts().json);
});

// Additional selector utilities
program.command('selector-from-name-params').description('Create selector from function name and parameters').argument('<params>', 'JSON object with name and parameters').action(async (params: string) => {
  const result = await AztecUtilities.selectorFromNameParams(params);
  outputResult(result, program.opts().json);
});

program.command('selector-from-field').description('Create selector from field').argument('<field>', 'Field value').action(async (field: string) => {
  const result = AztecUtilities.selectorFromField(field);
  outputResult(result, program.opts().json);
});

program.command('selector-from-string').description('Create selector from hex string').argument('<hex>', 'Hex string').action(async (hex: string) => {
  const result = AztecUtilities.selectorFromString(hex);
  outputResult(result, program.opts().json);
});

program.command('selector-empty').description('Get empty selector').action(async () => {
  const result = AztecUtilities.selectorEmpty();
  outputResult(result, program.opts().json);
});

program.command('event-selector').description('Compute event selector').argument('<sig>', 'Event signature').action(async (sig: string) => {
  const result = await AztecUtilities.eventSelector(sig);
  outputResult(result, program.opts().json);
});

program.command('note-selector').description('Compute note selector').argument('<sig>', 'Note signature').action(async (sig: string) => {
  const result = await AztecUtilities.noteSelector(sig);
  outputResult(result, program.opts().json);
});

// ABI encoding/decoding
program.command('abi-encode').description('ABI encode function arguments').argument('<params>', 'JSON object with abi and args').action(async (params: string) => {
  const result = AztecUtilities.abiEncode(params);
  // Array output - always JSON
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('abi-decode').description('ABI decode fields').argument('<params>', 'JSON object with types and fields').action(async (params: string) => {
  const result = AztecUtilities.abiDecode(params);
  // Decoded output - always JSON
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('decode-function-signature').description('Decode function signature').argument('<params>', 'JSON object with name and parameters').action(async (params: string) => {
  const result = AztecUtilities.decodeFunctionSignature(params);
  outputResult(result, program.opts().json);
});

// Additional field utilities
program.command('field-random').description('Generate random field element').action(async () => {
  const result = AztecUtilities.fieldRandom();
  outputResult(result, program.opts().json);
});

program.command('field-from-buffer').description('Create field from buffer').argument('<buffer>', 'Hex buffer').action(async (buffer: string) => {
  const result = AztecUtilities.fieldFromBuffer(buffer);
  outputResult(result, program.opts().json);
});

program.command('field-to-buffer').description('Convert field to buffer').argument('<field>', 'Field value').action(async (field: string) => {
  const result = AztecUtilities.fieldToBuffer(field);
  outputResult(result, program.opts().json);
});

program.command('field-from-bigint').description('Create field from bigint').argument('<value>', 'BigInt value').action(async (value: string) => {
  const result = AztecUtilities.fieldFromBigInt(value);
  outputResult(result, program.opts().json);
});

program.command('field-to-bigint').description('Convert field to bigint').argument('<field>', 'Field value').action(async (field: string) => {
  const result = AztecUtilities.fieldToBigInt(field);
  outputResult(result, program.opts().json);
});

program.command('field-is-zero').description('Check if field is zero').argument('<field>', 'Field value').action(async (field: string) => {
  const result = AztecUtilities.fieldIsZero(field);
  outputResult(result.toString(), program.opts().json);
});

program.command('field-equals').description('Compare two fields').argument('<field1>', 'First field').argument('<field2>', 'Second field').action(async (field1: string, field2: string) => {
  const result = AztecUtilities.fieldEquals(field1, field2);
  outputResult(result.toString(), program.opts().json);
});

// Contract artifact utilities
program.command('artifact-hash').description('Compute artifact hash').argument('<artifact>', 'Contract artifact JSON').action(async (artifact: string) => {
  const result = await AztecUtilities.artifactHash(artifact);
  outputResult(result, program.opts().json);
});

program.command('artifact-hash-preimage').description('Compute artifact hash preimage').argument('<artifact>', 'Contract artifact JSON').action(async (artifact: string) => {
  const result = await AztecUtilities.artifactHashPreimage(artifact);
  // Object output - always JSON
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('artifact-metadata-hash').description('Compute artifact metadata hash').argument('<artifact>', 'Contract artifact JSON').action(async (artifact: string) => {
  const result = AztecUtilities.artifactMetadataHash(artifact);
  outputResult(result, program.opts().json);
});

program.command('function-artifact-hash').description('Compute function artifact hash').argument('<function>', 'Function artifact JSON').action(async (function_: string) => {
  const result = await AztecUtilities.functionArtifactHash(function_);
  outputResult(result, program.opts().json);
});

program.command('function-metadata-hash').description('Compute function metadata hash').argument('<function>', 'Function artifact JSON').action(async (function_: string) => {
  const result = AztecUtilities.functionMetadataHash(function_);
  outputResult(result, program.opts().json);
});

// Buffer utilities
program.command('buffer-as-fields').description('Convert buffer to fields').argument('<params>', 'JSON object with buffer (hex) and targetLength').action(async (params: string) => {
  const result = AztecUtilities.bufferAsFields(params);
  // Array output - always JSON
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

// ABI type utilities
program.command('is-address-struct').description('Check if ABI type is address struct').argument('<abi_type>', 'ABI type JSON').action(async (abiType: string) => {
  const result = AztecUtilities.isAddressStruct(abiType);
  outputResult(result.toString(), program.opts().json);
});

program.command('is-eth-address-struct').description('Check if ABI type is ETH address struct').argument('<abi_type>', 'ABI type JSON').action(async (abiType: string) => {
  const result = AztecUtilities.isEthAddressStruct(abiType);
  outputResult(result.toString(), program.opts().json);
});

program.command('is-aztec-address-struct').description('Check if ABI type is Aztec address struct').argument('<abi_type>', 'ABI type JSON').action(async (abiType: string) => {
  const result = AztecUtilities.isAztecAddressStruct(abiType);
  outputResult(result.toString(), program.opts().json);
});

program.command('is-function-selector-struct').description('Check if ABI type is function selector struct').argument('<abi_type>', 'ABI type JSON').action(async (abiType: string) => {
  const result = AztecUtilities.isFunctionSelectorStruct(abiType);
  outputResult(result.toString(), program.opts().json);
});

program.command('is-wrapped-field-struct').description('Check if ABI type is wrapped field struct').argument('<abi_type>', 'ABI type JSON').action(async (abiType: string) => {
  const result = AztecUtilities.isWrappedFieldStruct(abiType);
  outputResult(result.toString(), program.opts().json);
});

program.command('is-bounded-vec-struct').description('Check if ABI type is bounded vec struct').argument('<abi_type>', 'ABI type JSON').action(async (abiType: string) => {
  const result = AztecUtilities.isBoundedVecStruct(abiType);
  outputResult(result.toString(), program.opts().json);
});

// Contract artifact loading
program.command('load-contract-artifact').description('Load contract artifact from Noir compiled contract').argument('<noir_contract>', 'Noir compiled contract JSON').action(async (noirContract: string) => {
  const result = AztecUtilities.loadContractArtifact(noirContract);
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('load-contract-artifact-for-public').description('Load contract artifact for public functions').argument('<noir_contract>', 'Noir compiled contract JSON').action(async (noirContract: string) => {
  const result = AztecUtilities.loadContractArtifactForPublic(noirContract);
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('contract-artifact-to-buffer').description('Serialize contract artifact to buffer').argument('<artifact>', 'Contract artifact JSON').action(async (artifact: string) => {
  const result = AztecUtilities.contractArtifactToBuffer(artifact);
  outputResult(result, program.opts().json);
});

program.command('contract-artifact-from-buffer').description('Deserialize contract artifact from buffer').argument('<buffer>', 'Hex buffer').action(async (buffer: string) => {
  const result = AztecUtilities.contractArtifactFromBuffer(buffer);
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

// EthAddress utilities
program.command('eth-address-zero').description('Get zero Ethereum address').action(async () => {
  const result = AztecUtilities.ethAddressZero();
  outputResult(result, program.opts().json);
});

program.command('eth-address-random').description('Generate random Ethereum address').action(async () => {
  const result = await AztecUtilities.ethAddressRandom();
  outputResult(result, program.opts().json);
});

program.command('eth-address-validate').description('Validate Ethereum address format').argument('<address>', 'Address to validate').action(async (address: string) => {
  const result = AztecUtilities.ethAddressValidate(address);
  console.log(JSON.stringify(result, null, program.opts().noPretty ? 0 : 2));
});

program.command('eth-address-from-field').description('Create Ethereum address from field').argument('<field>', 'Field value').action(async (field: string) => {
  const result = AztecUtilities.ethAddressFromField(field);
  outputResult(result, program.opts().json);
});

program.command('eth-address-to-field').description('Convert Ethereum address to field').argument('<address>', 'Ethereum address').action(async (address: string) => {
  const result = AztecUtilities.ethAddressToField(address);
  outputResult(result, program.opts().json);
});

program.command('eth-address-is-zero').description('Check if Ethereum address is zero').argument('<address>', 'Ethereum address').action(async (address: string) => {
  const result = AztecUtilities.ethAddressIsZero(address);
  outputResult(result.toString(), program.opts().json);
});

// Address computation utilities
program.command('compute-contract-address').description('Compute contract address from instance').argument('<instance>', 'Contract instance JSON').action(async (instance: string) => {
  const result = await AztecUtilities.computeContractAddress(instance);
  outputResult(result, program.opts().json);
});

program.command('compute-partial-address').description('Compute partial address').argument('<instance>', 'Contract instance JSON').action(async (instance: string) => {
  const result = await AztecUtilities.computePartialAddress(instance);
  outputResult(result, program.opts().json);
});

program.command('compute-preaddress').description('Compute preaddress').argument('<params>', 'JSON object with publicKeysHash and partialAddress').action(async (params: string) => {
  const result = await AztecUtilities.computePreaddress(params);
  outputResult(result, program.opts().json);
});

program.command('compute-address-from-keys').description('Compute address from public keys and partial address').argument('<params>', 'JSON object with publicKeys and partialAddress').action(async (params: string) => {
  const result = await AztecUtilities.computeAddressFromKeys(params);
  outputResult(result, program.opts().json);
});

program.command('compute-salted-initialization-hash').description('Compute salted initialization hash').argument('<params>', 'JSON object with initializationHash, salt, and deployer').action(async (params: string) => {
  const result = await AztecUtilities.computeSaltedInitializationHash(params);
  outputResult(result, program.opts().json);
});

program.command('compute-initialization-hash').description('Compute initialization hash').argument('<params>', 'JSON object with initFn (optional) and args').action(async (params: string) => {
  const result = await AztecUtilities.computeInitializationHash(params);
  outputResult(result, program.opts().json);
});

// Helper function to read from stdin
async function readStdin(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    let input = '';
    rl.on('line', (line) => {
      input += line + '\n';
    });
    rl.on('close', () => {
      resolve(input.trim());
    });
  });
}

program.parse();

