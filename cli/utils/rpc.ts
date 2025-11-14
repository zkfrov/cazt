import fetch from 'node-fetch';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface RpcClientOptions {
  rpcUrl: string;
  adminUrl: string;
  pretty: boolean;
}

export class RpcClient {
  private rpcUrl: string;
  private adminUrl: string;
  private pretty: boolean;

  constructor(options: RpcClientOptions) {
    this.rpcUrl = options.rpcUrl;
    this.adminUrl = options.adminUrl;
    this.pretty = options.pretty;
  }

  async call(method: string, params: any[]): Promise<any> {
    const url = method.startsWith('nodeAdmin_') ? this.adminUrl : this.rpcUrl;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as { result?: any; error?: any };
    
    if (data.error) {
      throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
    }

    return data.result;
  }

  formatOutput(result: any, pretty: boolean): string {
    if (pretty) {
      return JSON.stringify(result, null, 2);
    }
    return JSON.stringify(result);
  }
}

export function parseJsonOrFile(input: string): any {
  // Handle @ prefix (explicit file indicator)
  if (input.startsWith('@')) {
    const filePath = input.slice(1);
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }
  
  // Try to treat as file path if it looks like one
  // Check if it contains path separators or ends with .json
  if (input.includes('/') || input.includes('\\') || input.endsWith('.json')) {
    try {
      // Resolve the path (handles relative paths)
      const resolvedPath = resolve(input);
      if (existsSync(resolvedPath)) {
        const content = readFileSync(resolvedPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      // If file doesn't exist or can't be read, fall through to JSON parsing
    }
  }
  
  // Otherwise, treat as JSON string
  return JSON.parse(input);
}

