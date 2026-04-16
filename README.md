# AutoYield — AI Meme Hunter

> Build X Hackathon 2026 · X Layer Arena + Skills Arena dual submission

**Native to X Layer · Scans memes across Solana / Ethereum / Base / BSC**

One natural language query → AI calls **8 OKX OnchainOS Skills in parallel** → meme coin recommendations with exact contract addresses. **$0.05 USDC per scan** (x402 settled on X Layer, zero gas).

| Resource | Link |
|----------|------|
| 🌐 Live Web | https://autoyield-eight.vercel.app |
| 🔧 API | https://autoyield-production.up.railway.app |
| 📦 npm MCP package | [`autoyield-meme-scanner`](https://www.npmjs.com/package/autoyield-meme-scanner) |
| 📖 Main Repo | https://github.com/wanggang22/autoyield |
| 📱 Telegram Bot Reference | https://github.com/wanggang22/autoyield-meme-monitor |

## What It Does

AutoYield is an **AI Meme Hunter** deployed on X Layer. Users describe meme coin filtering criteria in natural language, the AI agent calls 8 OKX OnchainOS APIs in parallel to fetch on-chain data (price, holders, smart money signals, security scan, etc.), and returns ranked recommendations with **exact contract addresses ready to buy**.

**Core value**: Meme traders' biggest pain is "scattered information" — checking 8 dimensions (price, holders, smart money, security, dev wallet, etc.) for each coin takes hours. AutoYield consolidates them into one $0.05 AI report.

### Three Ways to Use

| Method | Target user | How |
|--------|------------|-----|
| 🌐 **Web Frontend** | Regular users | Connect wallet → input criteria → pay → see results |
| 🤖 **MCP Package** | AI tool users (Claude Code / Cursor) | `npx autoyield-meme-scanner` + natural language |
| ⚙️ **HTTP API** | Developers / Bots | POST `/api/strategy/start` + x402 signature (see `autoyield-meme-monitor`) |

## Architecture

```
User (Browser / Claude Code / Telegram Bot)
   │
   │ Natural language + x402 $0.05 USDC (EIP-3009, zero gas)
   ▼
┌────────────────────────────────────────────┐
│ AutoYield Agent Server (Railway)           │
│                                             │
│  x402Guard                                  │
│  └→ OKX Facilitator verify + settle        │
│                                             │
│  Claude Sonnet 4 (up to 20 rounds tool_use)│
│  └→ SKILL.md system prompt (~18K tokens)   │
│                                             │
│  Parallel calls to 8 OKX OnchainOS Skills: │
│  · get_meme_tokens    (okx-dex-trenches)   │
│  · get_signals         (okx-dex-signal)    │
│  · get_token_info      (okx-dex-token)     │
│  · get_token_advanced_info                 │
│  · get_token_holders                        │
│  · get_token_top_trader                     │
│  · get_token_cluster                        │
│  · scan_token_security (okx-security)      │
└────────────────────────────────────────────┘
   │
   ▼
X Layer Mainnet (Chain 196)
├── 4 Smart contracts (AgentRegistry v2, etc.)
├── x402 USDC settlement (OKX subsidizes gas)
└── Agentic Wallet (TEE-secured)
```

## Multi-Agent Architecture & Roles

This project deploys **2 coordinated Agents** on X Layer:

### Agent 1 · AutoYield Server Agent (primary)

- **Role**: Receives user queries, orchestrates 8 OKX OnchainOS APIs, returns meme coin analysis
- **Deployment**: Railway-hosted Node.js server (`scripts/agent-server.mjs`)
- **Agentic Wallet (TEE, on-chain identity)**: `0x817c2756f2b3f0977532be533bdafbc9d32dd30f`
  - Receives all x402 USDC income from users (per `payTo` in payment requirements)
  - TEE-secured via OKX Agentic Wallet API
- **Operational Signing Key (EOA)**: `0x418E21F39411f513E29bFfCa1742868271Eb8a24`
  - Signs outgoing operations (e.g., agent-to-agent payments via `/api/agent-pay`)
  - Local AGENT_PK (for low-latency signing)

### Agent 2 · Meme Monitor Bot (client agent)

- **Role**: Autonomous cron client that pays Agent 1 to discover meme coins, then pushes results to Telegram
- **Deployment**: GitHub Actions cron (`github.com/wanggang22/autoyield-meme-monitor`, every 2h)
- **Wallet**: `0x418E21F39411f513E29bFfCa1742868271Eb8a24`
  - Signs EIP-3009 authorization to pay $0.05 USDC per scan to Agent 1's TEE wallet
- **Demonstrates real agent-to-agent x402 flow**: one Agent pays another Agent for data on X Layer

### Smart Contracts (X Layer Mainnet)

| Contract | Address |
|----------|---------|
| AgentRegistry v2 | `0x7337a8963Dc7Cf0644f9423bBE397b3D0f97ACa1` |
| TaskManager | `0x599e23D6073426eBe357d03056258eEAa217e01D` |
| ReputationEngine | `0x3bf87bf49141B014e4Eef71A661988624c1af29F` |
| X402Rating | `0x85Be67F1A3c1f470A6c94b3C77fD326d3c0f1188` |

## Onchain OS Skill Usage

### Skills Actually Called (per scan)

| Skill | Function | Data |
|-------|----------|------|
| `okx-dex-trenches` | `get_meme_tokens` | Trending meme list + dev reputation |
| `okx-dex-signal` | `get_signals` | Smart money / whale / KOL signals |
| `okx-dex-token` (info) | `get_token_info` | Price, market cap, 24h volume |
| `okx-dex-token` (advanced) | `get_token_advanced_info` | Risk level, dev holdings, top-10 concentration |
| `okx-dex-token` (holders) | `get_token_holders` | Holder distribution |
| `okx-dex-token` (top) | `get_token_top_trader` | Most profitable wallets, PnL |
| `okx-dex-token` (cluster) | `get_token_cluster` | Address clustering, rug pull risk |
| `okx-security` | `scan_token_security` | Honeypot / rug pull detection |

**Supporting layer:** `okx-x402-payment` (payment) + `okx-agentic-wallet` (TEE signing)

### Skills Not Used (transparent disclosure)

- `okx-agentic-wallet` is only used at startup to query Agent's own balance, not for user trades
- `okx-audit-log` / `okx-onchain-gateway` / `okx-wallet-portfolio` / `okx-defi-*` — irrelevant to meme discovery
- **4 Uniswap Skills** — Solana memes have no Uniswap pools; forcing them in would be dishonest

### Skill Loading Mechanism

- **Startup loading:** `scripts/skills-loader.mjs` reads 17 SKILL.md files, extracts core rules, injects into Claude system prompt (~18K tokens)
- **AI decisions:** Claude Sonnet 4 reads SKILL.md and selects tools accordingly
- **Parallel execution:** Prompt enforces parallel tool calls (e.g., 50 simultaneous API calls in round 2-3 covering 10 candidates × 5 tools)

## How It Works

### User Flow

```
1. Connect OKX Wallet / MetaMask → switch to X Layer
2. Input filtering criteria in natural language
3. Sign EIP-3009 authorization for 0.05 USDC (no immediate spend, just authorization)
4. OKX Facilitator executes the transfer (zero gas)
5. Claude AI runs 8 tools in parallel (~45-70 seconds)
6. View results: Top 5 recommendations with exact contract addresses
7. Copy contract → search in OKX Wallet → one-click buy
```

### Key Technical Points

- **x402 zero-gas UX**: User signs to authorize but doesn't need to hold OKB/ETH. OKX Facilitator pays gas.
- **Skill-driven AI**: SKILL.md docs injected into system prompt. Claude makes decisions per Skill rules. Evaluator AI can scan `skills/` directory.
- **20-round parallel tool_use**: Server-side prompt enforces parallelism. Single scan invokes 30-60 API calls in 45-70s.
- **Anti-hallucination**: Output rules force "show contract addresses verbatim" — no AI shortcuts.

## X Layer Ecosystem Positioning

AutoYield is the **AI Meme Discovery Layer** in X Layer's ecosystem:

- **100% native to X Layer**: 4 contracts deployed on X Layer, x402 USDC settlement on X Layer, zero-gas UX
- **Deep OKX OnchainOS integration**: 8 Skills called in production + TEE Agentic Wallet + x402 Facilitator
- **3 input methods**: Web / MCP / HTTP API, covering different user segments
- **Reusable Skill**: MCP package on npm, other AI Agents can integrate immediately

## Project Structure

```
autoyield/
├── scripts/
│   ├── agent-server.mjs      # Main server (strategy + x402 + Claude)
│   ├── skills-loader.mjs     # 17 SKILL.md → Claude system prompt
│   ├── agentic-wallet.mjs    # OKX TEE wallet wrapper
│   └── test-strategies.mjs   # End-to-end test
├── skills/
│   ├── okx/                  # 13 OKX OnchainOS Skills
│   ├── uniswap/              # 4 Uniswap Skills (loaded but not called)
│   └── autoyield/SKILL.md    # Skills Arena submission
├── mcp-package/              # npm: autoyield-meme-scanner
├── src/                      # Solidity contracts
├── docs/index.html           # Frontend (i18n: EN/ZH toggle)
└── README.md
```

## Hackathon Submission

### X Layer Arena (Main Product)
- **Product**: AutoYield AI Meme Hunter
- **Highlights**: 8 OKX Skills called in real production · x402 zero-gas · 3 access methods · MCP protocol

### Skills Arena (Standalone Skill Package)
- **npm package**: `autoyield-meme-scanner`
- **Install**: `npx -y autoyield-meme-scanner`
- **Position**: "Use 8 on-chain data sources to help AI Agents make meme coin decisions"

### Target Special Awards
- 🏆 **Best MCP Integration** (500 USDT) — MCP protocol + npm published
- 🏆 **Best Data Analysis** (500 USDT) — One entry orchestrates 8 OKX data sources
- 🏆 **Most Active Agent** (500 USDT) — Telegram Bot cron auto-triggers every 2h

## Architecture Roadmap

Post-hackathon production refactor:

- **Hybrid orchestration** — JS pipeline for deterministic flow + narrow AI calls at key nodes (query parsing, token ranking, reason generation)
- **Rule-as-code** — Compile SKILL.md rules into JS implementation with 1:1 mapping and unit test coverage
- **Cost** — target $0.02 per scan (12× reduction from current)
- **Latency** — target <10s end-to-end (6× faster)
- **Safety** — 100% of Skill `MUST/SHOULD` rules backed by automated tests

## Environment Variables

```bash
AGENT_PK           # Agent wallet private key
OKX_API_KEY        # OKX OnchainOS API credentials
OKX_SECRET_KEY
OKX_PASSPHRASE
ANTHROPIC_API_KEY  # Claude Sonnet 4
PORT               # default 3080
```

## Quick Start

```bash
git clone https://github.com/wanggang22/autoyield.git
cd autoyield
npm install
node scripts/agent-server.mjs
```

## Team

| Role | Contact |
|------|---------|
| Developer / Designer / Everything | **Gavin Wang** |
| X (Twitter) | [@wangligang21](https://x.com/wangligang21) |
| Telegram | [@wangligang21](https://t.me/wangligang21) |
| Email (X Layer Arena) | wangligang161616@gmail.com |
| Email (Skills Arena) | gavinwang.ccsmy@gmail.com |

Solo developer building AutoYield for Build X Hackathon 2026.

## License

MIT

---

## 📖 中文版本说明 (Chinese Summary)

**AutoYield 是 X Layer 上的 AI Meme 猎手** —— 用一句自然语言描述你要的 meme 币筛选标准，AI Agent 并行调用 8 个 OKX OnchainOS 链上数据 API，综合分析后返回**带精确合约地址**的推荐。

每次扫描 $0.05 USDC，x402 在 X Layer 结算（OKX Facilitator 代付 gas）。

**三种使用方式：**
- 🌐 **网页**: https://autoyield-eight.vercel.app （右上角可切换中文）
- 🤖 **MCP 包**: `npx autoyield-meme-scanner` （Claude Code / Cursor）
- ⚙️ **HTTP API**: 直接调 `/api/strategy/start`，参考客户端 [autoyield-meme-monitor](https://github.com/wanggang22/autoyield-meme-monitor) （Python + Telegram Bot）

**真实使用的 8 个 OKX Skills：** dex-trenches, dex-signal, dex-token (5 functions), security

**未来规划：**
- 🏗 **架构演进** — 重构为 JS 编排 + AI 精细插入，目标单次成本降 12×
- 📏 **规则即代码** — 将 SKILL.md 硬规则编译到 JS 实现，逐条映射 + 单元测试覆盖
