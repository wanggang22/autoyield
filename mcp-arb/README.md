# autoyield-arbitrage-scanner

Cross-DEX arbitrage scanner as an MCP (Model Context Protocol) server. Detects real-time price spreads between **Uniswap Trading API** and **OKX DEX Aggregator** on Ethereum.

One natural language query → parallel dual-engine quotes → spread analysis → arbitrage opportunity detection.

Pay-per-scan via x402 micropayment ($0.02 USDC on X Layer, zero gas).

## What Makes This Different

This Skill uniquely combines **4 Uniswap AI Skills** with **OKX OnchainOS Skills** to create a cross-DEX price comparison tool:

```
Your AI Agent (Claude Code / Cursor)
  └── arb_scan tool (this MCP server)
       └── x402 auto-payment ($0.02 USDC, zero gas on X Layer)
            └── AutoYield API
                 ├── Uniswap Trading API (real quote)
                 │   ├── swap-integration Skill
                 │   ├── swap-planner Skill
                 │   ├── liquidity-planner Skill
                 │   └── pay-with-any-token Skill
                 └── OKX DEX Aggregator (500+ sources)
                     ├── okx-dex-swap Skill
                     └── okx-x402-payment Skill
```

## Quick Start

### 1. Install via npx (no install needed)

Add to your MCP config (`.mcp.json` for Claude Code, `~/.cursor/mcp.json` for Cursor):

```json
{
  "mcpServers": {
    "autoyield-arb": {
      "command": "npx",
      "args": ["-y", "autoyield-arbitrage-scanner"],
      "env": {
        "AGENT_PRIVATE_KEY": "your-x-layer-wallet-private-key"
      }
    }
  }
}
```

### 2. Or install globally

```bash
npm install -g autoyield-arbitrage-scanner
```

## Usage

After configuring MCP, just ask your AI:

```
"Check for arbitrage opportunities between Uniswap and OKX for ETH/USDC"
"Scan WBTC/USDC for cross-DEX spread"
"Is there arbitrage for 10000 USDC → WETH right now?"
"用 arb_scan 查 USDC/WETH 的套利机会"
```

Your AI agent will automatically call `arb_scan`, pay $0.02 USDC, and return:

- **Both engine quotes** (OKX + Uniswap output amounts)
- **Spread percentage** (how much the prices differ)
- **Better engine** (where to buy cheaper / sell higher)
- **Gross profit estimate** (before gas)
- **Strategy suggestion** (which direction to arbitrage)
- **Price impact** for each engine
- **DEX count / routing** used by each engine

## Example Output

```json
{
  "pair": "USDC/WETH",
  "amount": "1000 USDC",
  "chain": "Ethereum mainnet (1)",
  "engines": {
    "okx": {
      "engine": "OKX DEX Aggregator",
      "toHuman": 0.312805,
      "priceImpact": "0.012",
      "dexCount": 4
    },
    "uniswap": {
      "engine": "Uniswap Trading API",
      "toHuman": 0.312412,
      "priceImpact": "0.02"
    }
  },
  "arbitrage": {
    "spread": "0.1257%",
    "better": "OKX gives more output",
    "strategy": "Buy WETH on Uniswap, sell on OKX",
    "estimatedGrossProfit": "$0.3930 per 1000 USDC",
    "note": "Gross only — actual profit must deduct gas fees (~$5-30)"
  }
}
```

## Requirements

- **Node.js 18+**
- **X Layer wallet with USDC** ($0.02 USDC per scan)
- Get USDC on X Layer: https://www.okx.com/web3/dex-swap

## Supported Pairs

Tokens: `USDC`, `WETH`, `WBTC`, `USDT`, `DAI`

Example pair formats: `USDC/WETH`, `ETH/USDC`, `WBTC/USDC`, `USDT/DAI`

## Why Arbitrage Matters

Even with aggregators, DEX prices occasionally diverge due to:
- Incomplete aggregator routing
- Time-sensitive liquidity pool updates
- Fee tier differences
- MEV / ordering effects

This Skill lets AI agents automatically check for opportunities and suggest execution paths.

## Cost

- **$0.02 USDC per scan** (auto-paid via x402 on X Layer)
- Zero gas (OKX facilitator sponsors)
- Settlement tx recorded on X Layer (chain 196)

## Environment Variables

| Var | Required | Default | Description |
|-----|----------|---------|-------------|
| `AGENT_PRIVATE_KEY` | yes | — | X Layer wallet private key (for x402 payment) |
| `AGENT_URL` | no | `https://autoyield-production.up.railway.app` | AutoYield API base URL |

## Related

- **Main product:** [AutoYield on X Layer](https://autoyield-eight.vercel.app)
- **Source:** https://github.com/wanggang22/autoyield
- **Meme scanner (sister Skill):** [autoyield-meme-scanner](https://www.npmjs.com/package/autoyield-meme-scanner)

## License

MIT
