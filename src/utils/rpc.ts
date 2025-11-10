import fetch from 'node-fetch';
import { readFileSync } from 'fs';

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
  if (input.startsWith('@')) {
    const filePath = input.slice(1);
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }
  return JSON.parse(input);
}

