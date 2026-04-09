# AutoYield — AI DeFi Agent on X Layer

> Build X Hackathon 2026 | X Layer Arena + Skills Arena

**AI 帮你在 X Layer 上自动赚钱。** 选一个策略，AI Agent 用 17 个 OKX + Uniswap Skills 扫描全市场，给你最优 DeFi 建议。

**Live:** https://autoyield-eight.vercel.app
**API:** https://autoyield-production.up.railway.app
**GitHub:** https://github.com/wanggang22/autoyield

## 产品简介

AutoYield 是一个 AI DeFi 策略顾问，部署在 X Layer 上。用户选择一个策略，付 $0.05 x402 服务费（零 gas），AI Agent 调用多个工具分析市场，返回具体的 DeFi 操作建议。

三个策略：
- **稳健理财** — AI 搜索 X Layer 上最高收益的 DeFi 产品（Aave、Uniswap LP），给出 APY 对比和操作建议
- **聪明钱跟单** — AI 监控鲸鱼/聪明钱信号，安全扫描后给出跟单建议（买入价、止损、用哪个引擎）
- **自定义策略** — 用自然语言描述规则，AI 解析并执行分析

用户的资金始终在自己的钱包里，Agent 只收取 x402 服务费。

## 架构概述

```
用户（OKX Wallet / MetaMask）
  |  选策略 → x402 签名 $0.05（零 gas）
  v
AutoYield Agent Server（Railway）
  |
  +-- Claude AI（Haiku 4.5，Skill-driven tool_use）
  |     |-- 13 OKX SKILL.md 加载 → 安全规则、交易策略、DeFi 逻辑
  |     |-- 4 Uniswap SKILL.md 加载 → 路由、LP 规划、x402 支付
  |     +-- 20 工具可用，多轮执行（最多 10 轮）
  |
  +-- OKX OnchainOS API → 市场数据、DEX 聚合、安全扫描、DeFi、信号
  +-- Uniswap Trading API → Swap + LP（X Layer Router: 0x5507...2ff）
  +-- OKX x402 Facilitator → verify + settle（零 gas）
  +-- Agentic Wallet TEE → Agent 链上身份 + 签名
  |
  v
X Layer（Chain 196）
  +-- x402 结算（USDC/USDT/USDG，OKX 代付 gas）
  +-- Uniswap V3 池
  +-- Aave 借贷协议
```

## 部署地址

### Agent 身份（X Layer Mainnet）

| 类型 | 地址 |
|------|------|
| Agentic Wallet (TEE) | `0x817c2756f2b3f0977532be533bdafbc9d32dd30f` |
| x402 收款地址 | `0x418E21F39411f513E29bFfCa1742868271Eb8a24` |

### 智能合约（X Layer Mainnet, Chain 196）

| 合约 | 地址 |
|------|------|
| AgentRegistry (v2) | `0x7337a8963Dc7Cf0644f9423bBE397b3D0f97ACa1` |
| TaskManager | `0x599e23D6073426eBe357d03056258eEAa217e01D` |
| ReputationEngine | `0x3bf87bf49141B014e4Eef71A661988624c1af29F` |
| X402Rating | `0x85Be67F1A3c1f470A6c94b3C77fD326d3c0f1188` |

### 部署平台

| 服务 | 平台 | URL |
|------|------|-----|
| 前端 | Vercel | https://autoyield-eight.vercel.app |
| 后端 API | Railway | https://autoyield-production.up.railway.app |

## Onchain OS Skill 使用情况

### OKX Onchain OS Skills（13 个）

| Skill | 在 AutoYield 中的作用 |
|-------|---------------------|
| `okx-security` | 每次交易前强制安全扫描（fail-safe：扫描失败 = 禁止交易） |
| `okx-dex-swap` | 交易策略预设（Meme/主流/稳定币滑点）、MEV 保护 |
| `okx-agentic-wallet` | Agent 的链上身份，TEE 签名（登录、余额、转账、合约调用） |
| `okx-x402-payment` | Agent-to-Agent x402 支付签名 |
| `okx-dex-market` | 实时价格、K线、钱包 PnL 分析 |
| `okx-dex-signal` | 聪明钱/鲸鱼/KOL 信号追踪 |
| `okx-dex-token` | 代币搜索、持仓集群、顶级交易者、流动性分析 |
| `okx-dex-trenches` | Meme 币扫链、开发者信誉、Bundle 检测 |
| `okx-defi-invest` | DeFi 存入/取出/领取奖励（Aave、Uniswap LP 等） |
| `okx-defi-portfolio` | DeFi 持仓监控 |
| `okx-wallet-portfolio` | 公开地址余额查询（50+ 链） |
| `okx-onchain-gateway` | Gas 估计、交易模拟、广播 |
| `okx-audit-log` | 操作审计日志 |

### Uniswap AI Skills（4 个）

| Skill | 在 AutoYield 中的作用 |
|-------|---------------------|
| `swap-integration` | Uniswap Trading API 集成（check_approval → quote → swap） |
| `swap-planner` | Swap 智能规划，DexScreener 流动性/价格数据 |
| `liquidity-planner` | LP 仓位规划（价格区间、费率、无常损失评估） |
| `pay-with-any-token` | 余额不足时自动 swap 再支付 x402 |

### Skill 集成方式

SKILL.md 文件在 `skills/okx/` 和 `skills/uniswap/` 目录中。`scripts/skills-loader.mjs` 在启动时加载所有 17 个 Skill，提取核心知识（安全规则、策略预设、风控逻辑），构建 ~9600 tokens 的 Claude 系统提示。

Claude AI 读了这些 Skill 知识后，按照 Skill 的规则做决策：
- 交易前必须安全扫描（okx-security 的 fail-safe 原则）
- 按代币类型选滑点（okx-dex-swap 的策略预设）
- 双引擎比价选最优（OKX vs Uniswap）
- LP 按对类型选费率和区间（liquidity-planner）

## 运行机制

### 用户流程

```
1. 连接 OKX Wallet / MetaMask → 切换到 X Layer
2. 选择策略（稳健理财 / 聪明钱跟单 / 自定义）
3. 签名 x402 支付 $0.05 USDC（EIP-3009，零 gas）
4. AI Agent 执行（15-30 秒）：
   a. 安全扫描目标协议
   b. 搜索 DeFi 收益产品
   c. 对比 OKX vs Uniswap 价格
   d. 生成具体建议
5. 查看分析结果 + 推荐操作
```

### 经济循环

```
用户付 x402 服务费 → Agent 收入（Agentic Wallet）
  → Agent 用收入付其他 Agent 的信号服务（Agent-to-Agent x402）
  → 更好的信号 → 更好的建议 → 更多用户
```

### 双引擎对比

每次 swap 请求，并行查询 OKX DEX Aggregator（500+ 流动性源）和 Uniswap Trading API，比较有效输出金额后选最优。

## 项目在 X Layer 生态中的定位

AutoYield 是 X Layer 上的 AI DeFi 策略顾问：
- **原生 X Layer 应用** — 合约部署在 X Layer，x402 在 X Layer 结算，零 gas
- **Uniswap on X Layer** — 利用 Uniswap V3 在 X Layer 上的部署做 swap 和 LP 分析
- **Aave on X Layer** — 利用 Aave 在 X Layer 上的部署（2026.3.30 上线）做借贷收益分析
- **OKX 生态深度集成** — 13 个 Onchain OS Skills、Agentic Wallet TEE、x402 零 gas 支付

## 项目结构

```
autoyield/
├── scripts/
│   ├── agent-server.mjs      # 主服务器（策略引擎 + x402 + Claude + OKX + Uniswap）
│   ├── skills-loader.mjs     # 加载 17 个 SKILL.md → Claude 系统提示
│   ├── agentic-wallet.mjs    # OKX Agentic Wallet TEE 封装
│   └── mcp-server.mjs        # MCP Server（Skills Arena）
├── skills/
│   ├── okx/                  # 13 个 OKX Onchain OS Skills
│   └── uniswap/              # 4 个 Uniswap AI Skills
├── src/                      # Solidity 智能合约
├── docs/
│   └── index.html            # 前端（策略商城 UI）
├── Dockerfile                # Docker + onchainos 安装
└── README.md
```

## 环境变量

```bash
AGENT_PK           # Agent 钱包私钥（x402 收款 + fallback 签名）
OKX_API_KEY        # OKX API 凭证（Agentic Wallet + OnchainOS）
OKX_SECRET_KEY
OKX_PASSPHRASE
ANTHROPIC_API_KEY  # Claude API Key
UNISWAP_API_KEY    # Uniswap Trading API Key（可选）
PORT               # HTTP 端口（默认 3080）
```

## 快速开始

```bash
npm install
AGENT_PK=0x... OKX_API_KEY=... OKX_SECRET_KEY=... OKX_PASSPHRASE=... ANTHROPIC_API_KEY=... node scripts/agent-server.mjs
```

## 团队

独立开发者 — Build X Hackathon 2026

## License

MIT
