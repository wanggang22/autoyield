---
name: autoyield
description: "AutoYield AI DeFi Agent on X Layer. Use this skill when users want to: analyze crypto tokens, get smart money/whale signals, scan token security (honeypot/rug pull), find DeFi yields, compare swap quotes (OKX vs Uniswap dual engine), check wallet portfolios, discover meme coins, or run multi-step AI strategies. All endpoints are paid via x402 micropayments (USDC on X Layer, zero gas). Do NOT use for direct token transfers — use okx-dex-swap. Do NOT use for wallet balance queries — use okx-wallet-portfolio."
license: MIT
metadata:
  author: wanggang22
  version: "2.0.0"
  homepage: "https://autoyield-eight.vercel.app"
  github: "https://github.com/wanggang22/autoyield"
---

# AutoYield — AI DeFi Agent on X Layer

AI 帮你在 X Layer 上自动赚钱。选一个策略，AI Agent 用 17 个 OKX + Uniswap Skills 扫描全市场，给你最优 DeFi 建议。

- **Frontend:** https://autoyield-eight.vercel.app
- **API:** https://autoyield-production.up.railway.app
- **GitHub:** https://github.com/wanggang22/autoyield

## Endpoints

Base URL: `https://autoyield-production.up.railway.app`

### AI Ask — 通用 AI 问答
```
GET /api/ask?q={question}
x402: $0.02 USDC
```
AI Agent 调用 20+ 工具回答任何加密/DeFi 问题。

### Token Analysis — 代币分析
```
GET /api/analyze?q={token}
x402: $0.01 USDC
```
实时价格、K线趋势、AI 分析洞察。

### Smart Money Signals — 聪明钱信号
```
GET /api/signals?chain={chainIndex}
x402: $0.01 USDC
```
聪明钱/鲸鱼/KOL 交易信号，顶级交易者排行榜。

Chain: `1`=ETH, `56`=BSC, `196`=X Layer, `501`=Solana

### Token Security — 代币安全扫描
```
GET /api/security?q={token}&chain={chainIndex}
x402: $0.01 USDC
```
蜜罐、貔貅盘、高税率等风险检测。

### DeFi Yield — DeFi 收益搜索
```
GET /api/defi?token={symbol}&chain={chainIndex}
x402: $0.01 USDC
```
搜索 DeFi 收益产品（Aave、Uniswap LP、Lido 等），AI 给出推荐。

### Dual-Engine Swap — 双引擎比价
```
GET /api/dual-swap?from={tokenAddr}&to={tokenAddr}&amount={wei}
x402: $0.01 USDC
```
OKX DEX Aggregator vs Uniswap 比价，返回最优引擎。

### Portfolio — 钱包分析
```
GET /api/portfolio?address={walletAddress}
x402: $0.01 USDC
```
钱包持仓和组合价值（支持 20+ 链）。

### Meme Trenches — Meme 币发现
```
GET /api/trenches?chain={chainIndex}
x402: $0.01 USDC
```
热门 meme 币、新上线、趋势分析。

### Strategy — 多步骤 AI 策略
```
GET /api/strategy?q={goal}
x402: $0.05 USDC
```
复杂策略执行：信号→分析→交易、收益优化、组合再平衡、聪明钱跟单。

### Custom Strategy — 自定义策略
```
POST /api/strategy/start
Body: { "strategyId": "custom", "rule": "你的指令" }
x402: $0.05 USDC
```
自定义规则，AI Agent 最多 20 轮工具调用执行。

### Economic Loop — 经济循环演示
```
GET /api/economic-loop
x402: $0.02 USDC
```
Agent 经济循环：赚取 → 分析 → 投资 → 支付 → 再赚取。

### Agent Pay — Agent 间支付
```
GET /api/agent-pay?target={url}&amount={usdc}
x402: $0.01 USDC
```
向另一个 AI Agent 的 x402 端点付费调用，自动处理 402 协商和签名。

### Free Endpoints（无需付费）
- `GET /api/` — 所有端点列表
- `GET /status` — Agent 状态、钱包地址、运行时间
- `GET /api/strategy/status?address={addr}` — 组合和策略状态

## x402 Payment Flow

所有付费端点使用 x402 微支付协议（USDC on X Layer，零 gas）：

1. 请求端点 → 返回 HTTP `402 Payment Required`
2. 读取 `PAYMENT-REQUIRED` header（base64 JSON）获取金额、收款地址
3. 签名 EIP-3009 `TransferWithAuthorization`
4. 带 `X-PAYMENT` header（base64 签名）重放请求
5. 获取结果

### On-Chain 参数
| 参数 | 值 |
|------|-----|
| Network | X Layer (chain ID 196) |
| USDC | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` |
| AgentRegistry | `0x7337a8963Dc7Cf0644f9423bBE397b3D0f97ACa1` |
| Uniswap Router | `0x5507749f2c558bb3e162c6e90c314c092e7372ff` |
| Facilitator | OKX x402 (零 gas 结算) |
| 签名方式 | EIP-3009 TransferWithAuthorization |

### EIP-712 Domain
```json
{
  "name": "USD Coin",
  "version": "2",
  "chainId": 196,
  "verifyingContract": "0x74b7F16337b8972027F6196A17a631aC6dE26d22"
}
```

## MCP Integration

在 Claude Code 或 Cursor 中使用 AutoYield 作为工具：

```json
{
  "mcpServers": {
    "autoyield": {
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
