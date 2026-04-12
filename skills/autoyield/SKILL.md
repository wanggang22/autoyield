---
name: autoyield
description: "AutoYield Meme Scanner on X Layer. AI-powered meme coin discovery — one natural language query triggers 8 OKX OnchainOS APIs via 20-round AI agent loop. Use this skill when users want to find, filter, and rank meme coins on any chain (Solana, ETH, Base, etc.) with custom criteria. Paid via x402 micropayment ($0.05 USDC on X Layer, zero gas)."
license: MIT
metadata:
  author: AutoYield
  version: "2.0.0"
  homepage: "https://autoyield-eight.vercel.app"
  github: "https://github.com/wanggang22/autoyield"
---

# AutoYield Meme Scanner

用自然语言描述你的 meme 币筛选标准，AI Agent 自动调用 8 个链上数据 API 分析并返回推荐。

- **Frontend:** https://autoyield-eight.vercel.app
- **API:** https://autoyield-production.up.railway.app
- **GitHub:** https://github.com/wanggang22/autoyield

## Architecture

```
MCP 入口: meme_scan (自然语言 → $0.05 USDC x402)
  └── AI Agent 编排层 (Claude Haiku 4.5, 最多20轮并行工具调用)
       ├── get_meme_tokens    — OKX DEX Trenches API (热门meme币列表)
       ├── get_signals         — OKX Signal API (聪明钱/鲸鱼买入信号)
       ├── get_token_info      — OKX Token API (价格/市值/24h成交量)
       ├── get_token_advanced_info — OKX Token API (风险等级/开发者持仓/Top10集中度)
       ├── scan_token_security — OKX Security API (蜜罐/貔貅盘/高税率检测)
       ├── get_token_holders   — OKX Market API (持币人分布/前10占比)
       ├── get_token_top_trader — OKX Market API (顶级交易者/KOL持仓)
       └── get_token_cluster   — OKX Market API (地址聚类分析)
```

## MCP Tool

### meme_scan

用自然语言描述筛选标准，AI 自动解析并执行。

**Cost:** $0.05 USDC per scan (x402 auto-paid)

**Input:**
```json
{
  "query": "your filtering criteria in natural language"
}
```

**Examples:**
```
"Find Solana meme coins under $500K market cap with high turnover and healthy holder distribution"
"ETH chain meme coins with smart money buying signals, dev wallet empty, LP burned"
"Base chain new meme launches with >200 holders and turnover rate >100%"
"Solana 上市值 10K-500K、换手率超50%、前10持仓低于25%的搞笑 meme 币"
```

**Output:** Ranked list of meme coins with:
- Token name, symbol, contract address
- Price, market cap, 24h volume, turnover rate
- 24h price change
- Holder count, top 10 concentration
- Explosion reason (one-line insight)

## API Endpoint

```
POST https://autoyield-production.up.railway.app/api/strategy/start
Content-Type: application/json
X-PAYMENT: <base64 x402 signature>

{
  "strategyId": "custom",
  "rule": "your meme coin filtering criteria"
}
```

## AI Agent Execution Flow

1. **Round 1:** `get_meme_tokens` + `get_signals` (parallel) — get candidate list + smart money signals
2. **Round 2:** `get_token_info` x10 (parallel) — precise price/mcap/volume for all candidates
3. **Round 3:** `get_token_advanced_info` x10 (parallel) — risk/dev holding/top10 for all candidates
4. **Round 4:** `get_token_holders` + `get_token_top_trader` + `scan_token_security` (parallel) — deep dive on filtered candidates
5. **Round 5-6:** Additional data if needed, then generate final ranked output

Typical scan: **5-8 rounds, 30-60 tool calls, 45-70 seconds.**

## x402 Payment Flow

1. POST request → HTTP `402 Payment Required`
2. Read `PAYMENT-REQUIRED` header (base64 JSON) → get amount, payTo, asset
3. Sign EIP-3009 `TransferWithAuthorization` for USDC on X Layer
4. Replay with `X-PAYMENT` header (base64 signed payload)
5. Receive AI analysis result

### On-Chain Parameters
| Parameter | Value |
|-----------|-------|
| Network | X Layer (chain ID 196) |
| USDC | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` |
| AgentRegistry | `0x7337a8963Dc7Cf0644f9423bBE397b3D0f97ACa1` |
| Facilitator | OKX x402 (zero gas settlement) |
| Signing | EIP-3009 TransferWithAuthorization |

### EIP-712 Domain
```json
{
  "name": "USD Coin",
  "version": "2",
  "chainId": 196,
  "verifyingContract": "0x74b7F16337b8972027F6196A17a631aC6dE26d22"
}
```

## MCP Installation

Add to your `.mcp.json` (Claude Code / Cursor):

```json
{
  "mcpServers": {
    "autoyield-meme": {
      "command": "node",
      "args": ["scripts/mcp-server.mjs"],
      "env": {
        "AGENT_URL": "https://autoyield-production.up.railway.app",
        "AGENT_PRIVATE_KEY": "your-x-layer-wallet-private-key"
      }
    }
  }
}
```

Requires: Node.js 18+, USDC on X Layer wallet.

## Supported Chains

| Chain | Index | Meme Support |
|-------|-------|-------------|
| Solana | 501 | Full (trending + signals) |
| Ethereum | 1 | Full |
| Base | 8453 | Full |
| BSC | 56 | Full |
| X Layer | 196 | Full |

## OKX OnchainOS Skills Used

| Skill | API | Purpose |
|-------|-----|---------|
| okx-dex-trenches | DEX Trenches API | Meme token discovery, new launches |
| okx-dex-signal | Signal API | Smart money / whale / KOL detection |
| okx-dex-token | Token API | Price, market cap, volume, advanced info |
| okx-security | Security API | Honeypot, rug pull, tax scanning |
| okx-dex-market | Market API | Holder distribution, top traders, clustering |
