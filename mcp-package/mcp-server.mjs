#!/usr/bin/env node
/**
 * mcp-server.mjs — AutoYield Meme Scanner MCP Server
 *
 * 让任何 AI Agent (Claude Code, Cursor 等) 通过 MCP 工具调用 meme 币扫描服务。
 * 用户用自然语言描述筛选标准，AI Agent 自动分析并返回推荐。
 * x402 微支付自动处理，调用方只管用工具。
 *
 * Protocol: JSON-RPC 2.0 over stdio (MCP spec 2024-11-05)
 *
 * Env vars:
 *   AGENT_URL         — AutoYield API (default: https://autoyield-production.up.railway.app)
 *   AGENT_PRIVATE_KEY — X Layer 钱包私钥 (用于 x402 自动付费)
 *
 * Usage: npx -y autoyield-meme-scanner  (or: node mcp-package/mcp-server.mjs)
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
  process.stderr.write(`[mcp] ERROR: AGENT_PRIVATE_KEY not set.\n`);
  process.stderr.write(`[mcp] Please set AGENT_PRIVATE_KEY in your MCP config (.mcp.json) env section.\n`);
  process.stderr.write(`[mcp] Your wallet needs USDC on X Layer for x402 payment ($0.05/scan).\n`);
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
const walletClient = createWalletClient({ account, chain: XLAYER_CHAIN, transport: http() });
process.stderr.write(`[mcp] Wallet: ${account.address}\n`);

// ── x402 Auto Payment ──────────────────────────────────────────────────────

async function signX402Payment(requirements) {
  const accept = requirements.accepts ? requirements.accepts[0] : requirements;
  const { payTo, maxAmountRequired, asset } = accept;

  const amount = BigInt(maxAmountRequired);
  const nonce = '0x' + [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
  const validBefore = String(Math.floor(Date.now() / 1000) + 3600);

  const domain = {
    name: 'USD Coin', version: '2', chainId: 196, verifyingContract: USDC_ADDRESS,
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
    from: account.address, to: payTo, value: amount,
    validAfter: 0n, validBefore: BigInt(validBefore), nonce,
  };

  const signature = await walletClient.signTypedData({ domain, types, primaryType: 'TransferWithAuthorization', message });

  return Buffer.from(JSON.stringify({
    x402Version: requirements.x402Version || 1,
    scheme: accept.scheme || 'exact',
    network: accept.network || 'eip155:196',
    payload: {
      signature,
      authorization: {
        from: account.address, to: payTo, value: amount.toString(),
        validAfter: '0', validBefore: validBefore, nonce,
        asset: asset || USDC_ADDRESS,
      },
    },
  })).toString('base64');
}

// ── Meme Prompt Builder ─────────────────────────────────────────────────────

function buildMemePrompt(query) {
  return `你是一个专业的 meme 币猎手。根据用户的筛选标准，找出最有潜力的 meme 币。

【工具调用 — 必须用这些获取实时数据，不要编造】
1. get_meme_tokens (chain) — 获取热门 meme 币列表
2. get_signals (chain) — 获取聪明钱/鲸鱼买入信号
3. get_token_advanced_info — 风险等级、开发者持仓、Top10集中度
4. scan_token_security — 安全扫描（貔貅盘、蜜罐检测）
5. get_token_holders — 持币人分布
6. get_token_info — 价格、市值、24h成交量（每个币必须调用）
7. get_token_top_trader — 顶级交易者/KOL/鲸鱼持仓

【并行调用策略】
第1轮: get_meme_tokens + get_signals（并行）
第2轮: 对所有候选币同时调 get_token_info（并行）
第3轮: 对所有候选币同时调 get_token_advanced_info（并行）
第4轮: 对通过初筛的币调 get_token_holders + get_token_top_trader + scan_token_security（并行）
绝对不要一个币一个币串行查询！

【数据完整性】
每个输出的币必须有 get_token_info 返回的精确价格、市值、24h成交量。没有精确数字的币禁止输出。
所有数字必须是工具返回的真实值，不能写"不详"、"参考"、"万级"等模糊描述。

【输出格式 — 纯文本+emoji，禁止Markdown】
分析用中文，代币名称保留英文原名。第一个字符必须是🥇，不要写任何开头分析文字。每个币：

🥇 1. English Token Name (SYMBOL)
📋 合约: 完整合约地址
💰 价格: $0.00xxx | 市值: $xxx,xxx
📊 24h量: $xxx,xxx | 换手率: xxx%
📈 24h涨跌: +xx.x%
👥 持币人: xxx | 前10持仓: xx.x%
🔥 爆发理由: 一句话说明（中文，30字内）

排名emoji: 🥇🥈🥉4️⃣5️⃣，按潜力排序。如果不足5个满足条件就输出满足的，不要凑数。

【用户的筛选标准】
${query}`;
}

// ── MCP Tool ────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'meme_scan',
    description: 'Scan and analyze meme coins across chains. Describe your filtering criteria in natural language — the AI Agent will use 7+ on-chain tools to find, filter, and rank meme coins matching your requirements. Returns detailed analysis with price, market cap, volume, holder distribution, smart money signals, and security scan. Cost: $0.05 USDC per scan (x402 auto-paid). Example queries: "Find Solana meme coins under $500K market cap with high turnover", "ETH chain meme coins with smart money buying and dev wallet empty", "Base chain new meme launches with >200 holders". CRITICAL DISPLAY RULE: When showing results to user, you MUST preserve the FULL CONTRACT ADDRESS for every coin (the 📋 合约: line). Never summarize results into a table that drops contract addresses — users need the address to actually buy the token. Display each coin\'s contract address verbatim in monospace/code formatting.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Your meme coin search criteria in natural language. Describe what chain, market cap range, holder requirements, turnover rate, style preference, or any other filters you want. The AI will interpret and execute.',
        },
      },
      required: ['query'],
    },
  },
];

// ── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(name, args) {
  if (name !== 'meme_scan') return { error: `Unknown tool: ${name}` };

  const rule = buildMemePrompt(args.query);
  const url = AGENT_BASE_URL + '/api/strategy/start';

  try {
    // First request — will return 402
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategyId: 'custom', rule }),
    });

    if (res.status === 402) {
      const header = res.headers.get('PAYMENT-REQUIRED') || res.headers.get('payment-required');
      let requirements;
      try {
        requirements = header ? JSON.parse(Buffer.from(header, 'base64').toString('utf-8')) : await res.json();
      } catch { requirements = await res.text(); }

      process.stderr.write(`[mcp] x402 paying $0.05 for meme_scan...\n`);
      const paymentHeader = await signX402Payment(requirements);

      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-PAYMENT': paymentHeader },
        body: JSON.stringify({ strategyId: 'custom', rule }),
      });

      if (res.ok) {
        const data = await res.json();
        process.stderr.write(`[mcp] x402 paid ✓ tx: ${data.payment?.transaction || 'n/a'}\n`);

        // 返回精简结果给调用方
        return {
          result: data.result,
          toolsUsed: data.toolsUsed,
          stepsExecuted: data.stepsExecuted,
          payment: data.payment ? {
            amount: '$0.05 USDC',
            tx: data.payment.transaction,
            network: 'X Layer (196)',
          } : null,
        };
      } else {
        const body = await res.text();
        process.stderr.write(`[mcp] x402 failed: ${res.status} ${body.slice(0, 200)}\n`);
        return { error: `x402 payment failed: ${res.status}`, detail: body.slice(0, 500) };
      }
    }

    // 非 402 响应（不应该发生，但兜底）
    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}

// ── JSON-RPC over stdio (MCP) ──────────────────────────────────────────────

const SERVER_INFO = {
  name: 'autoyield-meme',
  version: '2.0.0',
  description: 'AutoYield Meme Scanner — AI-powered meme coin discovery with on-chain data, x402 micropayments on X Layer',
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

process.stderr.write(`[mcp] AutoYield Meme Scanner started\n`);
process.stderr.write(`[mcp] API: ${AGENT_BASE_URL}\n`);
process.stderr.write(`[mcp] Tool: meme_scan (1 tool, $0.05/scan)\n`);
