# AutoYield — AI DeFi Agent on X Layer

> Build X Hackathon 2026 | AI 帮你在 X Layer 上自动赚钱
> Powered by 13 OKX Onchain OS Skills + 4 Uniswap AI Skills

## What is AutoYield?

Choose a strategy, deposit USDC, AI does the rest. Three strategies:

1. **Steady Yield** — AI auto-finds highest DeFi yields (Aave, Uniswap LP), rebalances automatically. ~5-15% APY.
2. **Smart Copy** — AI monitors whale/smart money signals, security-scans, then auto-trades via dual engine (OKX vs Uniswap best price).
3. **Custom Strategy** — Describe rules in natural language, AI executes 24/7.

## Why AutoYield?

- **Dual Engine**: OKX DEX Aggregator (500+ sources) vs Uniswap — always best price
- **x402 Zero Gas**: Every operation individually signed, no blanket wallet approval
- **Skill-Driven AI**: Claude reads 17 expert SKILL.md files — security-first, MEV protection, optimal slippage
- **TEE Wallet**: Private keys in OKX Agentic Wallet secure enclave, never exposed

## Architecture

```
User (browser + MetaMask)
  |  select strategy + x402 sign
  v
AutoYield Agent Server (Railway)
  |-- Claude AI (17 Skills loaded as system prompt)
  |-- Strategy Engine (steady-yield / smart-copy / custom)
  |-- OKX OnchainOS API (13 Skills)
  |-- Uniswap Trading API (4 Skills)
  |-- x402 Payment Middleware
  |-- Agentic Wallet (TEE)
  v
X Layer (Chain 196) — Uniswap + Aave + USDC/USDT/USDG
```

## Onchain OS / Uniswap Skill Usage

| Skill | Usage |
|-------|-------|
| okx-security | Mandatory pre-scan before every trade (fail-safe) |
| okx-dex-swap | Trading with strategy presets + MEV protection |
| okx-dex-signal | Smart money/whale signal tracking |
| okx-defi-invest | DeFi deposit/withdraw/claim |
| okx-agentic-wallet | TEE wallet for all signing |
| okx-x402-payment | Agent-to-Agent payments |
| swap-integration | Uniswap Trading API on X Layer |
| liquidity-planner | LP position planning (ranges, fees) |
| + 9 more | Market data, token analysis, meme scanning, portfolio, gateway |

## Quick Start

```bash
npm install
AGENT_PK=0x... OKX_API_KEY=... OKX_SECRET_KEY=... OKX_PASSPHRASE=... ANTHROPIC_API_KEY=... node scripts/agent-server.mjs
```

## License

MIT
