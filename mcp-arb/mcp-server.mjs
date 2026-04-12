#!/usr/bin/env node
/**
 * autoyield-arbitrage-scanner — MCP Server
 *
 * Cross-DEX arbitrage scanner. Detects price spreads between Uniswap Trading API
 * and OKX DEX Aggregator on Ethereum in real-time.
 *
 * Uses 4 Uniswap AI Skills:
 *   - swap-integration (Trading API /quote)
 *   - swap-planner (routing analysis)
 *   - liquidity-planner (pool depth awareness)
 *   - pay-with-any-token (x402 auto-payment)
 *
 * Plus OKX OnchainOS Skills:
 *   - okx-dex-swap (500+ source aggregator)
 *   - okx-x402-payment (payment settlement)
 *
 * Protocol: JSON-RPC 2.0 over stdio (MCP spec 2024-11-05)
 *
 * Usage:
 *   npx -y autoyield-arbitrage-scanner
 *
 * Env:
 *   AGENT_URL         — AutoYield API (default: autoyield-production.up.railway.app)
 *   AGENT_PRIVATE_KEY — X Layer wallet private key (for x402 auto-pay)
 */

import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const AGENT_BASE_URL = process.env.AGENT_URL || 'https://autoyield-production.up.railway.app';
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

const XLAYER_CHAIN = {
  id: 196, name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
};
const USDC_XLAYER = '0x74b7F16337b8972027F6196A17a631aC6dE26d22';

if (!PRIVATE_KEY) {
  process.stderr.write(`[mcp-arb] ERROR: AGENT_PRIVATE_KEY not set.\n`);
  process.stderr.write(`[mcp-arb] Please set AGENT_PRIVATE_KEY in your MCP config.\n`);
  process.stderr.write(`[mcp-arb] Your wallet needs USDC on X Layer for x402 payment ($0.02/scan).\n`);
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
const walletClient = createWalletClient({ account, chain: XLAYER_CHAIN, transport: http() });
process.stderr.write(`[mcp-arb] Wallet: ${account.address}\n`);

// ── x402 Auto Payment ──────────────────────────────────────────────────────

async function signX402Payment(requirements) {
  const accept = requirements.accepts ? requirements.accepts[0] : requirements;
  const { payTo, maxAmountRequired, asset } = accept;
  const amount = BigInt(maxAmountRequired);
  const nonce = '0x' + [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
  const validBefore = String(Math.floor(Date.now() / 1000) + 3600);

  const sig = await walletClient.signTypedData({
    domain: { name: 'USD Coin', version: '2', chainId: 196, verifyingContract: USDC_XLAYER },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: { from: account.address, to: payTo, value: amount, validAfter: 0n, validBefore: BigInt(validBefore), nonce },
  });

  return Buffer.from(JSON.stringify({
    x402Version: requirements.x402Version || 1,
    scheme: accept.scheme || 'exact',
    network: accept.network || 'eip155:196',
    payload: {
      signature: sig,
      authorization: {
        from: account.address, to: payTo, value: amount.toString(),
        validAfter: '0', validBefore, nonce, asset: asset || USDC_XLAYER,
      },
    },
  })).toString('base64');
}

// ── MCP Tool Definitions ────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'arb_scan',
    description: 'Detect cross-DEX arbitrage opportunities on Ethereum in real-time. Queries Uniswap Trading API and OKX DEX Aggregator in parallel for the same trading pair, calculates price spread, and identifies profitable arbitrage direction. Returns both engine quotes, spread percentage, estimated gross profit (before gas), and suggested strategy. Cost: $0.02 USDC per scan (x402 auto-paid). Uses 4 Uniswap AI Skills + OKX OnchainOS Skills. DISPLAY RULE: Always show both engine outputs, spread %, and profit estimate to user clearly.',
    inputSchema: {
      type: 'object',
      properties: {
        pair: {
          type: 'string',
          description: 'Trading pair in format "FROM/TO" (e.g. "USDC/WETH", "ETH/USDC", "WBTC/USDC"). Supported tokens: USDC, WETH, WBTC, USDT, DAI.',
          default: 'USDC/WETH',
        },
        amount: {
          type: 'number',
          description: 'Amount of the FROM token to quote (default: 1000). For USDC/WETH with amount 1000 = 1000 USDC input.',
          default: 1000,
        },
      },
      required: [],
    },
  },
];

// ── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(name, args) {
  if (name !== 'arb_scan') return { error: `Unknown tool: ${name}` };

  const pair = args.pair || 'USDC/WETH';
  const amount = args.amount || 1000;
  const url = `${AGENT_BASE_URL}/api/arb-scan?pair=${encodeURIComponent(pair)}&amount=${amount}`;

  try {
    let res = await fetch(url);

    if (res.status === 402) {
      const header = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('payment-required');
      let requirements;
      try {
        requirements = header ? JSON.parse(Buffer.from(header, 'base64').toString('utf-8')) : await res.json();
      } catch { requirements = await res.text(); }

      process.stderr.write(`[mcp-arb] x402 paying $0.02 for arb_scan ${pair}...\n`);
      const paymentHeader = await signX402Payment(requirements);
      res = await fetch(url, { headers: { 'X-PAYMENT': paymentHeader } });

      if (res.ok) {
        const data = await res.json();
        process.stderr.write(`[mcp-arb] x402 paid ✓ tx: ${data.payment?.transaction?.slice(0, 20) || 'n/a'}\n`);
        return data;
      } else {
        const body = await res.text();
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
  name: 'autoyield-arbitrage',
  version: '1.0.0',
  description: 'Cross-DEX arbitrage scanner — Uniswap vs OKX on Ethereum, x402 micropayments',
};

function handleRequest(request) {
  const { method, params, id } = request;

  switch (method) {
    case 'initialize':
      return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: SERVER_INFO } };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    case 'tools/call': {
      const { name, arguments: args } = params;
      return executeTool(name, args || {}).then(result => ({
        jsonrpc: '2.0', id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      }));
    }
    case 'notifications/initialized':
      return null;
    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
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

process.stderr.write(`[mcp-arb] AutoYield Arbitrage Scanner started\n`);
process.stderr.write(`[mcp-arb] API: ${AGENT_BASE_URL}\n`);
process.stderr.write(`[mcp-arb] Tool: arb_scan (1 tool, $0.02/scan)\n`);
