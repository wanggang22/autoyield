# autoyield-meme-scanner

AI-powered meme coin scanner as an MCP (Model Context Protocol) server. Use it inside Claude Code, Cursor, or any MCP-compatible AI agent.

**One natural language query → 8 OKX OnchainOS APIs → 20-round AI analysis → ranked meme coin recommendations.**

Pay-per-scan via x402 micropayment ($0.05 USDC on X Layer, zero gas).

## How It Works

This is an **MCP server** — it doesn't run on its own. Your AI client (Claude Code / Cursor) starts it as a subprocess and talks to it via JSON-RPC over stdio.

```
You write rule in AI client
        ↓
AI client (Claude Code / Cursor)
   reads .mcp.json → spawns this MCP server as subprocess
        ↓
MCP server (this package)
   ├── Receives natural language rule from AI
   ├── Auto-pays $0.05 USDC via x402 (uses your wallet key)
   ├── Calls AutoYield API
   └── Returns meme coin recommendations to AI
        ↓
AI displays results to you
```

## Setup (3 Steps)

### Step 1 · Choose Install Method

You have two options. **Both require configuring `.mcp.json` in Step 2** — the choice only affects how the package is fetched.

**Option A: Use `npx` (recommended, no manual install)**

Skip this step. `npx` will auto-download the package the first time your AI client starts the MCP server (first launch ~5-10s, subsequent launches use cache).

**Option B: Pre-install globally (faster startup, manual updates)**

```bash
npm install -g autoyield-meme-scanner
```

Saves a few seconds on first startup, but you'll need to run `npm update -g autoyield-meme-scanner` to get newer versions.

### Step 2 · Configure your AI client

Edit your MCP config file:

| AI Client | Config Path |
|-----------|-------------|
| Claude Code (project) | `.mcp.json` (in project root) |
| Claude Code (global) | `~/.claude.json` (under `mcpServers`) |
| Cursor | `~/.cursor/mcp.json` |

**For Option A (npx):**
```json
{
  "mcpServers": {
    "autoyield-meme": {
      "command": "npx",
      "args": ["-y", "autoyield-meme-scanner"],
      "env": {
        "AGENT_PRIVATE_KEY": "0xYOUR_X_LAYER_WALLET_PRIVATE_KEY"
      }
    }
  }
}
```

**For Option B (globally installed):**
```json
{
  "mcpServers": {
    "autoyield-meme": {
      "command": "autoyield-meme-scanner",
      "env": {
        "AGENT_PRIVATE_KEY": "0xYOUR_X_LAYER_WALLET_PRIVATE_KEY"
      }
    }
  }
}
```

### Step 3 · Restart AI client

Restart Claude Code / Cursor so it picks up the new MCP config and spawns the server.

That's it — try asking your AI: *"Find Solana meme coins under $500K market cap"*

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
