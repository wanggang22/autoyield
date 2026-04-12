#!/usr/bin/env node
/**
 * mcp-server.mjs — AutoYield MCP Server
 *
 * Exposes AutoYield AI Agent capabilities as MCP tools.
 * Any AI Agent (Claude Code, Cursor, etc.) can install this and call our services.
 * x402 micropayments are handled automatically — caller just uses tools.
 *
 * Protocol: JSON-RPC 2.0 over stdio (MCP spec 2024-11-05)
 *
 * Env vars:
 *   AGENT_URL         — AutoYield API base URL (default: https://autoyield-production.up.railway.app)
 *   AGENT_PRIVATE_KEY — X Layer wallet private key (for auto x402 payment)
 *
 * Usage: node scripts/mcp-server.mjs
 */

import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ── Configuration ───────────────────────────────────────────────────────────

const AGENT_BASE_URL = process.env.AGENT_URL || 'https://autoyield-production.up.railway.app';
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

const XLAYER_CHAIN = {
  id: 196, name: 'X Layer', network: 'xlayer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
};

const USDC_ADDRESS = '0x74b7F16337b8972027F6196A17a631aC6dE26d22';

if (!PRIVATE_KEY) {
  process.stderr.write(`[mcp] ERROR: AGENT_PRIVATE_KEY not set. This is required for x402 auto-payment.\n`);
  process.stderr.write(`[mcp] Please set AGENT_PRIVATE_KEY in your MCP config (.mcp.json) env section.\n`);
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
const walletClient = createWalletClient({ account, chain: XLAYER_CHAIN, transport: http() });
process.stderr.write(`[mcp] Wallet: ${account.address}\n`);

// ── x402 Auto Payment ──────────────────────────────────────────────────────

async function signX402Payment(requirements) {
  // requirements 可能是完整的 { accepts: [...] } 或单个 accept 对象
  const accept = requirements.accepts ? requirements.accepts[0] : requirements;
  const { payTo, maxAmountRequired, asset } = accept;

  const amount = BigInt(maxAmountRequired);
  const nonce = '0x' + [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
  const validBefore = String(Math.floor(Date.now() / 1000) + 3600);

  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId: 196,
    verifyingContract: USDC_ADDRESS,
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  const message = {
    from: account.address,
    to: payTo,
    value: amount,
    validAfter: 0n,
    validBefore: BigInt(validBefore),
    nonce,
  };

  const signature = await walletClient.signTypedData({ domain, types, primaryType: 'TransferWithAuthorization', message });

  // 必须匹配 agent-server x402Guard 期望的完整 payload 格式
  const paymentPayload = {
    x402Version: requirements.x402Version || 1,
    scheme: accept.scheme || 'exact',
    network: accept.network || 'eip155:196',
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: payTo,
        value: amount.toString(),
        validAfter: '0',
        validBefore: validBefore,
        nonce,
        asset: asset || USDC_ADDRESS,
      },
    },
  };

  return Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
}

// ── MCP Tool Definitions ────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'autoyield_ask',
    description: 'Ask the AutoYield AI Agent any question about crypto, DeFi, or X Layer. Uses 20+ tools (market data, signals, security, DeFi, Uniswap) to answer. x402: $0.02 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Your question (e.g. "What is the best yield for USDC on X Layer?")' },
      },
      required: ['question'],
    },
  },
  {
    name: 'autoyield_analyze',
    description: 'AI market analysis for any token: real-time price, K-line trends, AI insights. x402: $0.01 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token name or symbol (e.g. BTC, ETH, OKB)' },
      },
      required: ['token'],
    },
  },
  {
    name: 'autoyield_dual_swap',
    description: 'Compare swap quotes: OKX DEX Aggregator vs Uniswap on X Layer. Returns which engine gives better price. x402: $0.01 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        from_token: { type: 'string', description: 'Input token address on X Layer' },
        to_token: { type: 'string', description: 'Output token address on X Layer' },
        amount: { type: 'string', description: 'Amount in minimal units (wei)' },
      },
      required: ['from_token', 'to_token', 'amount'],
    },
  },
  {
    name: 'autoyield_signals',
    description: 'Smart money / whale / KOL trading signals and top trader leaderboard. x402: $0.01 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: 'Chain index: "1" ETH, "196" X Layer, "501" Solana. Default "1"' },
      },
      required: [],
    },
  },
  {
    name: 'autoyield_security',
    description: 'Scan token for security risks: honeypot, rug pull, high tax. x402: $0.01 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token name, symbol, or contract address' },
        chain: { type: 'string', description: 'Chain index, default "196"' },
      },
      required: ['token'],
    },
  },
  {
    name: 'autoyield_defi',
    description: 'Search DeFi yield products on X Layer and other chains. Best APY from Aave, Uniswap LP, Lido, etc. x402: $0.01 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token symbol (e.g. USDC, ETH)' },
        chain: { type: 'string', description: 'Chain index, default "196"' },
      },
      required: [],
    },
  },
  {
    name: 'autoyield_portfolio',
    description: 'Wallet holdings and portfolio value across 20+ chains. x402: $0.01 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Wallet address (0x...)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'autoyield_strategy',
    description: 'Execute multi-step AI strategy: signal-to-trade, yield optimization, portfolio rebalance, smart money follow. x402: $0.05 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', description: 'Strategy goal (e.g. "Find the best yield for 1000 USDC on X Layer")' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'autoyield_trenches',
    description: 'Hot meme coins, new launches, trend analysis. x402: $0.01 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'string', description: 'Chain index, default "1"' },
      },
      required: [],
    },
  },
];

// ── Tool → Endpoint Mapping ────────────────────────────────────────────────

const TOOL_TO_ENDPOINT = {
  autoyield_ask:       (args) => ({ method: 'GET', path: `/api/ask?q=${encodeURIComponent(args.question)}` }),
  autoyield_analyze:   (args) => ({ method: 'GET', path: `/api/analyze?q=${encodeURIComponent(args.token)}` }),
  autoyield_dual_swap: (args) => ({ method: 'GET', path: `/api/dual-swap?from=${args.from_token}&to=${args.to_token}&amount=${args.amount}` }),
  autoyield_signals:   (args) => ({ method: 'GET', path: `/api/signals?chain=${args.chain || '1'}` }),
  autoyield_security:  (args) => ({ method: 'GET', path: `/api/security?q=${encodeURIComponent(args.token)}&chain=${args.chain || '196'}` }),
  autoyield_defi:      (args) => ({ method: 'GET', path: `/api/defi?token=${encodeURIComponent(args.token || 'USDC')}&chain=${args.chain || '196'}` }),
  autoyield_portfolio: (args) => ({ method: 'GET', path: `/api/portfolio?address=${args.address}` }),
  autoyield_strategy:  (args) => ({ method: 'GET', path: `/api/strategy?q=${encodeURIComponent(args.goal)}` }),
  autoyield_trenches:  (args) => ({ method: 'GET', path: `/api/trenches?chain=${args.chain || '1'}` }),
};

// ── Tool Execution with Auto x402 ─────────────────────────────────────────

async function executeTool(name, args) {
  const endpointFn = TOOL_TO_ENDPOINT[name];
  if (!endpointFn) return { error: `Unknown tool: ${name}` };

  const { method, path } = endpointFn(args);
  const url = AGENT_BASE_URL + path;

  try {
    // First request
    let res = await fetch(url);

    if (res.status === 402) {
      // Parse payment requirements
      const header = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('payment-required');
      let requirements;
      try {
        requirements = header ? JSON.parse(Buffer.from(header, 'base64').toString('utf-8')) : await res.json();
      } catch { requirements = await res.text(); }

      // Auto-pay
      process.stderr.write(`[mcp] x402 paying for ${name}...\n`);
      const paymentHeader = await signX402Payment(requirements);
      res = await fetch(url, { headers: { 'X-PAYMENT': paymentHeader } });

      if (res.ok) {
        const data = await res.json();
        process.stderr.write(`[mcp] x402 paid ✓\n`);
        return data;
      } else {
        const body = await res.text();
        process.stderr.write(`[mcp] x402 payment failed: ${res.status} ${body.slice(0, 200)}\n`);
        return { error: `x402 payment failed: ${res.status}`, detail: body.slice(0, 500) };
      }
    }

    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

// ── JSON-RPC over stdio (MCP) ──────────────────────────────────────────────

const SERVER_INFO = {
  name: 'autoyield',
  version: '2.0.0',
  description: 'AutoYield AI DeFi Agent on X Layer — 20+ tools, x402 micropayments, OKX + Uniswap dual engine',
};

function handleRequest(request) {
  const { method, params, id } = request;

  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        },
      };

    case 'tools/list':
      return {
        jsonrpc: '2.0', id,
        result: { tools: TOOLS },
      };

    case 'tools/call': {
      const { name, arguments: args } = params;
      return executeTool(name, args || {}).then(result => ({
        jsonrpc: '2.0', id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      }));
    }

    case 'notifications/initialized':
      return null;

    default:
      return {
        jsonrpc: '2.0', id,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}

// ── stdio transport ─────────────────────────────────────────────────────────

let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const request = JSON.parse(line);
      const response = handleRequest(request);
      if (response === null) continue;
      const resolved = await response;
      if (resolved) process.stdout.write(JSON.stringify(resolved) + '\n');
    } catch (err) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id: null,
        error: { code: -32700, message: `Parse error: ${err.message}` },
      }) + '\n');
    }
  }
});

process.stderr.write(`[mcp] AutoYield MCP Server started\n`);
process.stderr.write(`[mcp] API: ${AGENT_BASE_URL}\n`);
process.stderr.write(`[mcp] Tools: ${TOOLS.length}\n`);
