# autoyield-meme-scanner

AI-powered meme coin scanner as an MCP (Model Context Protocol) server. Use it inside Claude Code, Cursor, or any MCP-compatible AI agent.

**One natural language query → 8 OKX OnchainOS APIs → 20-round AI analysis → ranked meme coin recommendations.**

Pay-per-scan via x402 micropayment ($0.05 USDC on X Layer, zero gas).

## Quick Start

### 1. Install via npx (no install needed)

Add to your MCP config (`.mcp.json` for Claude Code, `~/.cursor/mcp.json` for Cursor):

```json
{
  "mcpServers": {
    "autoyield-meme": {
      "command": "npx",
      "args": ["-y", "autoyield-meme-scanner"],
      "env": {
        "AGENT_PRIVATE_KEY": "your-x-layer-wallet-private-key"
      }
    }
  }
}
```

### 2. Or install globally

```bash
npm install -g autoyield-meme-scanner
```

Then use:
```json
{
  "mcpServers": {
    "autoyield-meme": {
      "command": "autoyield-meme-scanner",
      "env": {
        "AGENT_PRIVATE_KEY": "your-x-layer-wallet-private-key"
      }
    }
  }
}
```

## Requirements

- **Node.js 18+**
- **X Layer wallet with USDC** (gets $0.05 USDC per scan)
- Get USDC on X Layer: https://www.okx.com/web3/dex-swap

## Usage

After configuring MCP, just ask your AI:

```
"Find Solana meme coins under $500K market cap with high turnover"
"ETH chain meme coins with smart money buying and dev wallet empty"
"Base chain new meme launches with >200 holders"
"Solana 上换手率超100%、前10持仓<25%的搞笑 meme 币"
```

Your AI agent will automatically call the `meme_scan` tool, pay $0.05 USDC, and return ranked meme coin analysis with:
- Token name, symbol, contract address
- Real-time price, market cap, 24h volume, turnover rate
- 24h price change
- Holder count, top 10 concentration
- Smart money signals
- One-line explosion reason

## Architecture

```
Your AI Agent (Claude Code / Cursor)
  └── meme_scan tool (this MCP server)
       └── x402 auto-payment ($0.05 USDC, zero gas)
            └── AutoYield API (Claude AI Agent, 20-round loop)
                 ├── get_meme_tokens     — OKX DEX Trenches
                 ├── get_signals          — OKX Signal API
                 ├── get_token_info       — OKX Token API
                 ├── get_token_advanced_info
                 ├── scan_token_security  — OKX Security API
                 ├── get_token_holders    — OKX Market API
                 ├── get_token_top_trader
                 └── get_token_cluster
```

## Environment Variables

| Var | Required | Default | Description |
|-----|----------|---------|-------------|
| `AGENT_PRIVATE_KEY` | yes | — | X Layer wallet private key for x402 auto-payment |
| `AGENT_URL` | no | `https://autoyield-production.up.railway.app` | AutoYield API base URL |

## Cost

- **$0.05 USDC per scan** (auto-paid via x402)
- Settled on X Layer (chain 196), zero gas (OKX facilitator pays gas)
- USDC contract: `0x74b7F16337b8972027F6196A17a631aC6dE26d22`

## Supported Chains

Solana (501), Ethereum (1), Base (8453), BSC (56), X Layer (196).

## Links

- **Source:** https://github.com/wanggang22/autoyield
- **Live demo:** https://autoyield-eight.vercel.app
- **API:** https://autoyield-production.up.railway.app

## License

MIT
