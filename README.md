# AutoYield — AI DeFi Agent on X Layer

> Build X Hackathon 2026 · X Layer Arena + Skills Arena 双提交

**AI 帮你在 X Layer 上自动赚钱。** 选一个策略，付 $0.05 USDC（x402，零 gas），AI Agent 调用 17 个 Onchain OS + Uniswap Skills 分析全市场，返回可执行建议。

| | |
|--|--|
| 🌐 Live | https://autoyield-eight.vercel.app |
| 🔧 API | https://autoyield-production.up.railway.app |
| 📦 NPM (MCP) | [`autoyield-meme-scanner`](https://www.npmjs.com/package/autoyield-meme-scanner) |
| 📖 GitHub | https://github.com/wanggang22/autoyield |
| 👀 参考客户端 | https://github.com/wanggang22/autoyield-meme-monitor |

## 项目简介

AutoYield 是一个 AI DeFi 策略顾问，原生部署在 X Layer 上。用户选策略、付 $0.05 x402 服务费（零 gas），AI Agent 并行调用多个 OKX OnchainOS + Uniswap Skills 分析市场，返回带真实链上数据的 DeFi 建议。

**三个策略：**
- **🟢 稳健理财** — AI 并行调用 5 个工具（defi_search × 2 链、get_pool_data、get_yield_data、dual_engine_quote），给出 X Layer 借贷 + LP + 跨链 + 双引擎 swap 对比完整方案
- **🟡 聪明钱跟单** — 鲸鱼/聪明钱信号 → 安全扫描 → 双引擎买入推荐
- **🎨 自定义/Meme 扫链** — 自然语言描述，AI 最多 20 轮并行工具调用，覆盖 meme 币发现-筛选-推荐全流程

**用户资金始终在自己钱包**，Agent 只收 x402 服务费。

## 架构概述

```
用户（OKX Wallet / MetaMask / Claude Code / 开发者脚本）
   │
   │ 选策略 → x402 签名 $0.05（EIP-3009，零 gas）
   ▼
┌─────────────────────────────────────────┐
│ AutoYield Agent Server (Railway)        │
│                                          │
│ ┌─── Claude AI Sonnet 4 ─────────────┐  │
│ │  Skill-driven system prompt         │  │
│ │  · 加载 17 个 SKILL.md             │  │
│ │  · 最多 20 轮并行 tool_use         │  │
│ │  · 预调 5 工具 (steady-yield) 防幻觉│  │
│ └─────────────────────────────────────┘  │
│                                          │
│ ┌─── 22+ Claude Tools ────────────────┐ │
│ │ • OKX OnchainOS API (13 Skills)     │ │
│ │ • Uniswap Trading API (4 Skills)    │ │
│ │ • DefiLlama + DexScreener           │ │
│ │ • x402 Facilitator                  │ │
│ │ • Agent-to-Agent pay                │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────┐
│ X Layer Mainnet (Chain 196)             │
│  · 4 部署合约（AgentRegistry 等）       │
│  · x402 USDC 结算（零 gas / OKX 代付）  │
│  · Uniswap V3 + Aave V3                 │
└─────────────────────────────────────────┘
```

## 部署地址

### Agent 链上身份

| 类型 | 地址 |
|------|------|
| Agentic Wallet (TEE-secured) | `0x817c2756f2b3f0977532be533bdafbc9d32dd30f` |
| x402 收款地址 | `0x418E21F39411f513E29bFfCa1742868271Eb8a24` |

### 智能合约 (X Layer Mainnet)

| 合约 | 地址 |
|------|------|
| AgentRegistry v2 | `0x7337a8963Dc7Cf0644f9423bBE397b3D0f97ACa1` |
| TaskManager | `0x599e23D6073426eBe357d03056258eEAa217e01D` |
| ReputationEngine | `0x3bf87bf49141B014e4Eef71A661988624c1af29F` |
| X402Rating | `0x85Be67F1A3c1f470A6c94b3C77fD326d3c0f1188` |

### 部署平台

| 服务 | 平台 | URL |
|------|------|-----|
| 前端 | Vercel | autoyield-eight.vercel.app |
| 后端 API | Railway | autoyield-production.up.railway.app |
| MCP 包 | npm | autoyield-meme-scanner |

## Onchain OS Skill 使用情况

### OKX Onchain OS Skills（13 个，10+ 真实调用）

| Skill | 映射工具 | 在哪个策略使用 | 真实调用 |
|-------|---------|--------------|--------|
| `okx-dex-trenches` | `get_meme_tokens` | meme_scan | ✅ |
| `okx-dex-signal` | `get_signals` | smart-copy, meme_scan | ✅ |
| `okx-dex-token` | `get_token_info/advanced_info/holders/top_trader/cluster` | meme_scan | ✅ (5 工具) |
| `okx-security` | `scan_token_security` | smart-copy, meme_scan | ✅ |
| `okx-defi-invest` | `defi_search` | steady-yield | ✅ |
| `okx-defi-portfolio` | `get_yield_data` | steady-yield | ✅ |
| `okx-dex-market` | 市场数据 | ask 端点 | ✅ |
| `okx-dex-swap` | `get_swap_quote` | steady-yield | ✅ |
| `okx-x402-payment` | x402 facilitator | 每次付款 | ✅ |
| `okx-agentic-wallet` | TEE 签名 | 启动时余额查询 | ✅ |
| `okx-wallet-portfolio` | `get_portfolio` | /api/portfolio 端点 | ✅ |
| `okx-onchain-gateway` | gas 估计 | 辅助 | ⚠️ 部分 |
| `okx-audit-log` | 操作日志 | 未启用 | ❌ |

### Uniswap AI Skills（4 个，2 真实调用）

| Skill | 映射工具 | 在哪使用 | 真实调用 |
|-------|---------|---------|--------|
| `swap-integration` | `uniswap_quote` | steady-yield (dual_engine_quote) | ✅ (Ethereum) |
| `liquidity-planner` | `get_pool_data` (DexScreener) | steady-yield | ✅ |
| `swap-planner` | `get_yield_data` (DefiLlama) | steady-yield | ✅ |
| `pay-with-any-token` | x402 扩展 | 未启用 | ❌ |

**Uniswap Trading API 说明**：在 X Layer 链上流动性不足（`{errorCode: "ResourceNotFound"}`）；Ethereum 链报价正常。Section D 双引擎对比主要在 ETH 链场景展示价值。

### Skill 集成方式

- **加载**：启动时 `scripts/skills-loader.mjs` 读取 `skills/okx/*.md` + `skills/uniswap/*.md`
- **注入**：提取每个 Skill 的核心规则（安全规则、策略预设、风控逻辑），构建 ~18K tokens Claude 系统提示
- **执行**：Claude Sonnet 4 读懂 Skill 知识后自主选择工具、按 Skill 规则决策
- **预调**：steady-yield 服务端强制预调 5 个工具，杜绝 AI 偷懒 / 幻觉

## 运作机制

### 用户接入方式（三种）

| 方式 | 目标用户 | 调用链路 |
|------|---------|---------|
| 🌐 **网页前端** | 普通用户 | 连钱包 → 选策略 → x402 签名 → 结果 |
| 🤖 **MCP 包** | AI 开发者 (Claude Code / Cursor) | `npx autoyield-meme-scanner` + 自然语言 |
| ⚙️ **HTTP API** | 开发者 / Bot | POST `/api/strategy/start` + 自签 x402 |

### 策略执行流程（以 steady-yield 为例）

```
1. 收到请求 + x402 签名
2. OKX facilitator verify + settle (零 gas)
3. 服务端预调 5 个 Skill 工具（并行）：
   · defi_search (X Layer USDC)
   · defi_search (Ethereum USDC)
   · get_yield_data (DefiLlama 全链)
   · get_pool_data (DexScreener Uniswap V3)
   · dual_engine_quote (OKX + Uniswap)
4. Claude Sonnet 4 综合 5 路数据
5. 输出 A-D 四类方案对比 + 跨链回本分析
```

### 经济循环（Agent-to-Agent 支付）

```
┌─────────────────────────┐
│ autoyield-meme-monitor  │ 每 12h 调用
│ (GitHub Actions cron)    │
└───────────┬─────────────┘
            │ 付 $0.05 USDC (x402)
            ▼
┌─────────────────────────┐
│ AutoYield 主 Agent      │ ← 收入
│ · 运行 AI 分析           │
│ · 调用外部 Agent（x402）│ ← 支出（if 需要额外数据）
└───────────┬─────────────┘
            │ 推送 Telegram
            ▼
         用户决策
```

### 双引擎对比（OKX vs Uniswap）

- **OKX DEX Aggregator** — 500+ 流动性源聚合，包括 Uniswap、Curve、PancakeSwap 等
- **Uniswap Trading API** — 直接 Uniswap V2/V3/V4 报价
- 两边并行查询，比较最终输出 + 推荐引擎

## 项目在 X Layer 生态中的定位

AutoYield 是 X Layer 上的 **AI DeFi 助手基础设施**：

- **原生 X Layer 应用** — 4 合约 + x402 USDC 结算 + 零 gas（OKX facilitator）
- **多协议集成** — Aave V3 (X Layer 借贷)、Uniswap V3 (LP + swap)、OKX DEX (聚合)
- **OKX 生态深度绑定** — 13 个 Onchain OS Skills + TEE Agentic Wallet + x402 支付
- **可组合 / 可扩展** — MCP 协议 + SKILL.md + npm 包，其他 AI Agent 可即刻接入

## 项目结构

```
autoyield/
├── scripts/
│   ├── agent-server.mjs        # 主服务器（策略 + x402 + Claude）
│   ├── skills-loader.mjs       # 加载 17 个 SKILL.md
│   ├── agentic-wallet.mjs      # TEE 钱包封装
│   └── test-strategies.mjs     # 策略端到端测试
├── skills/
│   ├── okx/                    # 13 个 OKX Skills
│   ├── uniswap/                # 4 个 Uniswap Skills
│   └── autoyield/SKILL.md      # Skills Arena 提交物
├── mcp-package/                # npm: autoyield-meme-scanner
│   ├── package.json
│   ├── mcp-server.mjs
│   └── README.md
├── src/                        # Solidity 合约
├── docs/index.html             # 前端 UI
└── README.md
```

## 黑客松提交信息

### X Layer Arena 提交（主产品）
- 产品：AutoYield AI DeFi Agent
- 亮点：17 Skills 集成、x402 零 gas、4 合约部署、3 种接入方式、实时链上数据分析

### Skills Arena 提交（独立 Skill）
- 包名：`autoyield-meme-scanner`（已发布 npm）
- 安装：`npx -y autoyield-meme-scanner`
- 特性：1 个 MCP 工具入口 → 8 个 OKX OnchainOS Skills 真实并行调用
- 定位：用链上数据辅助 Agent 决策（meme 币筛选）

### 目标特奖
- 🏆 **最佳 MCP 集成** — MCP 协议标准实现 + npm 发布
- 🏆 **最佳数据分析** — 1 个工具编排 8 个链上数据源
- 🏆 **最佳 x402 应用** — 服务端 + 客户端都用 x402，Agent-to-Agent 场景
- 🏆 **最佳经济循环** — meme-monitor → AutoYield → (未来：外部 Agent)
- 🏆 **最活跃 Agent** — 定时自动扫描产生持续链上交易

## 环境变量

```bash
AGENT_PK           # Agent 钱包私钥
OKX_API_KEY        # OKX API 凭证（Agentic Wallet + OnchainOS + x402）
OKX_SECRET_KEY
OKX_PASSPHRASE
ANTHROPIC_API_KEY  # Claude Sonnet 4
UNISWAP_API_KEY    # Uniswap Trading API (https://hub.uniswap.org/)
PORT               # 默认 3080
```

## 快速开始

```bash
git clone https://github.com/wanggang22/autoyield.git
cd autoyield
npm install
# 配置 .env 后
node scripts/agent-server.mjs
```

## 团队

独立开发者 · Build X Hackathon 2026

## License

MIT
