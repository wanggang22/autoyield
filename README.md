# AutoYield — AI Meme Hunter

> Build X Hackathon 2026 · X Layer Arena + Skills Arena 双提交

**Native to X Layer · 扫描 Solana / Ethereum / Base / BSC 四链 meme 币**

一句自然语言 → AI 并行调用 8 个 OKX OnchainOS Skills → 精确到合约地址的 meme 币推荐。
每次 $0.05 USDC（x402 结算在 X Layer，零 gas）。

| 入口 | 链接 |
|------|------|
| 🌐 网页前端 | https://autoyield-eight.vercel.app |
| 🔧 API | https://autoyield-production.up.railway.app |
| 📦 npm MCP 包 | [`autoyield-meme-scanner`](https://www.npmjs.com/package/autoyield-meme-scanner) |
| 📖 主仓库 | https://github.com/wanggang22/autoyield |
| 📱 Telegram Bot | https://github.com/wanggang22/autoyield-meme-monitor |

## 项目简介

AutoYield 是 X Layer 上的 **AI Meme Hunter** —— 用自然语言描述你要的 meme 币筛选标准，AI 并行调用 8 个 OKX OnchainOS 链上数据 API，综合分析后返回**带精确合约地址**的推荐。

**核心价值**：meme 玩家最大的痛点是"信息太散"——要查价格、持仓、聪明钱、安全、dev 情况等 8 个维度。AutoYield 用一次 $0.05 USDC 的付费把这些数据整合进一份 AI 分析报告。

### 3 种接入方式

| 方式 | 目标用户 | 使用方法 |
|------|---------|---------|
| 🌐 **网页前端** | 普通用户 | 连钱包 → 输入筛选条件 → 付费 → 看结果 |
| 🤖 **MCP 包** | AI 编程工具用户 (Claude Code / Cursor) | `npx autoyield-meme-scanner` + 自然语言 |
| ⚙️ **HTTP API** | 开发者 / Bot | POST `/api/strategy/start` + x402 签名（参考 `autoyield-meme-monitor`） |

## 架构概述

```
用户（浏览器 / Claude Code / Telegram Bot）
   │
   │ 1 句自然语言 + x402 $0.05 USDC（EIP-3009，零 gas）
   ▼
┌────────────────────────────────────────────┐
│ AutoYield Agent Server (Railway)           │
│                                             │
│  x402Guard                                  │
│  └→ OKX Facilitator verify + settle        │
│                                             │
│  Claude Sonnet 4 (最多 20 轮并行 tool_use) │
│  └→ SKILL.md 系统提示 (18K tokens)         │
│                                             │
│  并行调用 8 个 OKX OnchainOS Skills:       │
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
├── 4 智能合约（AgentRegistry v2 等）
├── x402 USDC 结算（OKX 代付 gas）
└── Agentic Wallet (TEE-secured)
```

## 部署地址

### Agent 链上身份

| 类型 | 地址 |
|------|------|
| Agentic Wallet (TEE) | `0x817c2756f2b3f0977532be533bdafbc9d32dd30f` |
| x402 收款地址 | `0x418E21F39411f513E29bFfCa1742868271Eb8a24` |

### 智能合约（X Layer Mainnet）

| 合约 | 地址 |
|------|------|
| AgentRegistry v2 | `0x7337a8963Dc7Cf0644f9423bBE397b3D0f97ACa1` |
| TaskManager | `0x599e23D6073426eBe357d03056258eEAa217e01D` |
| ReputationEngine | `0x3bf87bf49141B014e4Eef71A661988624c1af29F` |
| X402Rating | `0x85Be67F1A3c1f470A6c94b3C77fD326d3c0f1188` |

## Onchain OS Skill 使用情况

### 真实调用的 Skills（每次 meme 扫描都跑）

| Skill | 工具函数 | 数据来源 |
|-------|---------|---------|
| `okx-dex-trenches` | `get_meme_tokens` | 热门 meme 币列表 + dev 信誉 |
| `okx-dex-signal` | `get_signals` | 聪明钱 / 鲸鱼 / KOL 交易信号 |
| `okx-dex-token` (info) | `get_token_info` | 价格、市值、24h 成交量 |
| `okx-dex-token` (advanced) | `get_token_advanced_info` | 风险等级、dev 持仓、Top10 集中度 |
| `okx-dex-token` (holders) | `get_token_holders` | 持币人分布 |
| `okx-dex-token` (top) | `get_token_top_trader` | 最赚地址、PnL |
| `okx-dex-token` (cluster) | `get_token_cluster` | 地址聚类、rug pull 风险 |
| `okx-security` | `scan_token_security` | 蜜罐 / 貔貅盘检测 |

**支撑层：** `okx-x402-payment`（付费）+ `okx-agentic-wallet`（TEE 签名）

### 不使用的 Skills（保持诚实）

- `okx-agentic-wallet` 只在启动时用于查 Agent 余额，不用于用户交易
- `okx-audit-log` / `okx-onchain-gateway` / `okx-wallet-portfolio` / `okx-defi-*`：跟 meme 发现场景无关，不加入
- **4 个 Uniswap Skills**：Solana meme 在 Uniswap 没池子，强加反而傻，不使用

### Skill 加载方式

- **启动加载：** `scripts/skills-loader.mjs` 读取 17 个 SKILL.md，提取核心规则注入 Claude 系统提示（约 18K tokens）
- **执行决策：** Claude Sonnet 4 读了 SKILL.md 后按规则选工具
- **并行调用：** Prompt 强制要求并行调用（第 2-3 轮对 10 个候选币同时调用 5 个工具 = 50 次 API 并行）

## 运作机制

### 用户流程

```
1. 连 OKX Wallet / MetaMask → X Layer
2. 自然语言输入筛选标准
3. 签名 EIP-3009 授权 0.05 USDC (不立即花钱，只是授权)
4. OKX Facilitator 代执行（零 gas）
5. Claude AI 并行跑 8 工具 (45-70 秒)
6. 看结果：带精确合约地址的 Top 5 推荐
7. 复制合约到 OKX Wallet 搜索 → 一键买入
```

### 核心技术点

- **x402 零 gas 体验**：用户签名 = 付费，但不用持有 OKB/ETH。OKX Facilitator 代付 gas。
- **Skill-driven AI**：SKILL.md 文档注入系统提示，Claude 按 Skill 规则决策。评审 AI 能扫到 `skills/` 目录结构。
- **20 轮并行工具调用**：服务端 prompt 强制并行，单次扫描 30-60 次 API 调用，45-70 秒完成。
- **防幻觉**：输出"强制显示合约地址"规则，杜绝 AI 省略关键信息。

## 项目在 X Layer 生态中的定位

AutoYield 是 X Layer 生态中的 **AI Meme 发现层**：

- **100% X Layer 原生**：4 合约部署 X Layer，x402 USDC 结算 X Layer，零 gas 体验
- **OKX OnchainOS 深度集成**：8 个 Skills 真实调用 + TEE Agentic Wallet + x402 Facilitator
- **3 种输入方式**：网页 / MCP / HTTP API，覆盖不同用户群
- **可复用 Skill**：MCP 包发布到 npm，其他 AI Agent 可直接接入

## 项目结构

```
autoyield/
├── scripts/
│   ├── agent-server.mjs      # 主服务器 (策略引擎 + x402 + Claude)
│   ├── skills-loader.mjs     # 17 SKILL.md → Claude 系统提示
│   ├── agentic-wallet.mjs    # OKX TEE 钱包封装
│   └── test-strategies.mjs   # 端到端测试
├── skills/
│   ├── okx/                  # 13 OKX OnchainOS Skills
│   ├── uniswap/              # 4 Uniswap Skills (加载但未调用)
│   └── autoyield/SKILL.md    # Skills Arena 提交物
├── mcp-package/              # npm: autoyield-meme-scanner
├── src/                      # Solidity 合约
├── docs/index.html           # 前端
└── README.md
```

## 黑客松提交信息

### X Layer Arena（主产品）
- **产品**：AutoYield AI Meme Hunter
- **亮点**：8 OKX Skills 真实并行调用 · x402 零 gas · 3 种接入方式 · MCP 协议

### Skills Arena（独立 Skill 包）
- **npm 包**：`autoyield-meme-scanner`
- **安装**：`npx -y autoyield-meme-scanner`
- **定位**："用 8 个链上数据源辅助 AI Agent 做 meme 币决策"

### 目标特奖
- 🏆 **最佳 MCP 集成**（500 USDT）— MCP 协议 + npm 发布
- 🏆 **最佳数据分析**（500 USDT）— 1 个入口编排 8 个 OKX 数据源
- 🏆 **最活跃 Agent**（500 USDT）— Telegram Bot cron 每 2h 自动触发

## 环境变量

```bash
AGENT_PK           # Agent 钱包私钥
OKX_API_KEY        # OKX OnchainOS API 凭证
OKX_SECRET_KEY
OKX_PASSPHRASE
ANTHROPIC_API_KEY  # Claude Sonnet 4
PORT               # 默认 3080
```

## 快速开始

```bash
git clone https://github.com/wanggang22/autoyield.git
cd autoyield
npm install
node scripts/agent-server.mjs
```

## 团队

独立开发者 · Build X Hackathon 2026

## License

MIT
