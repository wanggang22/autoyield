# Demo 视频脚本（2 分钟）

> **目标**：展示 AutoYield AI Meme Hunter 如何用一句话扫全链 meme 币
> **时长**：90-120 秒
> **工具**：OBS Studio / 手机录屏（免费）+ CapCut 剪辑（免费）
> **背景音乐**：轻快电子乐（可选，抖音热门 BGM）

---

## 🎬 分镜脚本

### **段 1 — 开场 (0:00-0:15) · 15 秒**

**画面：** 屏幕显示 `autoyield-eight.vercel.app` 前端 Hero 区

**你的旁白（中文）：**
> "Solana 上每天上百个新 meme 币，找到对的那个要查 8 个数据源。我做了一个工具，**一句话，8 个链上数据源并行分析**，直接推荐可买入的币。"

**画面叠加文字：**
- "AutoYield — AI Meme Hunter"
- "Build X Hackathon 2026"

---

### **段 2 — 网页演示 (0:15-0:50) · 35 秒**

**画面流程：**
1. (0:15) 鼠标滚动到"立即体验"区
2. (0:18) 输入框输入："找 Solana 上市值 10K-500K、聪明钱在买的 meme 币"
3. (0:22) 点"开始扫描"按钮
4. (0:25) OKX Wallet 弹窗 → 连接
5. (0:28) 钱包签名 EIP-3009 弹窗 → 确认（画面放大钱包签名详情）
6. (0:30) 页面显示 "🔄 AI 分析中..."
7. (0:35) **快进镜头** — 显示分析进行中
8. (0:42) 结果显示：5 个 meme 币 + 合约地址 + 价格 + 市值 + 爆发理由
9. (0:48) 鼠标高亮合约地址

**你的旁白：**
> "输入筛选标准 → 签名 $0.05 USDC（零 gas，OKX 代付）→ AI 并行调用 8 个 OKX OnchainOS Skills → 45 秒后，5 个 meme 币，带合约地址、市值、持仓、聪明钱信号。"

**画面叠加文字：**
- "x402 micropayment · zero gas"
- "8 OKX Skills parallel calls"
- "✅ Complete in 45s"

---

### **段 3 — MCP 演示 (0:50-1:20) · 30 秒**

**画面流程：**
1. (0:50) 切到 VS Code 打开 Claude Code 终端
2. (0:52) 显示 `.mcp.json` 配置（已隐藏私钥）
3. (0:55) 在 Claude Code 里输入："用 autoyield-meme 扫描 Solana 上有 3 个以上聪明钱在买的 meme"
4. (0:58) Claude 自动调用 `meme_scan` 工具 → 显示工具调用通知
5. (1:02) 等待画面 → 结果出现
6. (1:10) 结果包含合约 + 推荐 + 支付 tx 哈希

**你的旁白：**
> "或者，在 Claude Code / Cursor 里直接说一句话。MCP 协议自动处理付费，AI Agent 拿回结果。npm 包已发布，`npx autoyield-meme-scanner` 即可安装。"

**画面叠加文字：**
- "npm: autoyield-meme-scanner"
- "MCP auto-payment"

---

### **段 4 — Telegram Bot 演示 (1:20-1:40) · 20 秒**

**画面流程：**
1. (1:20) 切到手机 Telegram 界面
2. (1:22) 显示 AutoYield Bot 推送（历史消息）
3. (1:25) 高亮一个币的合约地址
4. (1:28) 切到 OKX Wallet App，搜索该合约
5. (1:32) 币的交易对自动显示，滑点/价格
6. (1:36) 点"买入" → 确认（不需要真的买，停在确认页）

**你的旁白：**
> "每 2 小时，GitHub Actions cron 自动跑 meme 扫描，结果推到 Telegram。复制合约到 OKX Wallet 一键买入。"

**画面叠加文字：**
- "Auto cron every 2h"
- "One-click buy via OKX Wallet"

---

### **段 5 — 技术亮点 + 结尾 (1:40-2:00) · 20 秒**

**画面流程：**
1. (1:40) 切到架构图（README 里的那个 ASCII 图或者 docs/index.html 的 Skills 列表）
2. (1:45) 快速展示 8 个 OKX Skills 列表
3. (1:50) 显示 4 个合约地址（X Layer Mainnet）
4. (1:55) 最后 logo + 链接

**你的旁白：**
> "8 个 OKX OnchainOS Skills 并行调用，Claude Sonnet 4 综合决策，X Layer 原生部署，x402 零 gas 支付。开源、可复用、AI Agent 友好。"

**画面叠加文字：**
- "GitHub: wanggang22/autoyield"
- "Live: autoyield-eight.vercel.app"
- "npm: autoyield-meme-scanner"
- "X Layer Hackathon 2026"

---

## 🎤 旁白完整文本（连起来）

> Solana 上每天上百个新 meme 币，找到对的那个要查 8 个数据源。我做了一个工具，一句话，8 个链上数据源并行分析，直接推荐可买入的币。
>
> 输入筛选标准 → 签名 0.05 USDC，零 gas，OKX 代付 → AI 并行调用 8 个 OKX OnchainOS Skills → 45 秒后，5 个 meme 币，带合约地址、市值、持仓、聪明钱信号。
>
> 或者，在 Claude Code、Cursor 里直接说一句话。MCP 协议自动处理付费，AI Agent 拿回结果。npm 包已发布，npx autoyield-meme-scanner 即可安装。
>
> 每 2 小时，GitHub Actions cron 自动跑 meme 扫描，结果推到 Telegram。复制合约到 OKX Wallet 一键买入。
>
> 8 个 OKX OnchainOS Skills 并行调用，Claude Sonnet 4 综合决策，X Layer 原生部署，x402 零 gas 支付。开源、可复用、AI Agent 友好。

## 📋 录制检查清单

**录制前：**
- [ ] 关掉通知（微信、钉钉等弹窗会出现）
- [ ] 浏览器隐身模式（避免历史记录、书签栏出现）
- [ ] OKX Wallet 钱包至少有 $0.20 USDC
- [ ] 准备好 Claude Code 打开一个空项目（已配好 MCP）
- [ ] Telegram 手机端有过去的 Bot 推送记录
- [ ] 如果录屏模糊，用 1080p 或更高

**录制顺序建议：**
1. 先录网页演示（最重要的 35 秒）
2. 再录 MCP 演示
3. 再录 Telegram + OKX Wallet
4. 最后录架构图段

**剪辑要点：**
- 中间等待时间用 **2-3 倍速** 快进（AI 分析 45 秒可压缩到 10 秒）
- 加字幕（提高可读性）
- BGM 音量压低到 20%（别盖住旁白）
- 结尾 3 秒停留在 "GitHub / Live / npm" 三行链接

**上传：**
- YouTube（公开）或 Google Drive（公开分享链接）
- 复制链接填到 Google Form

---

## 🔗 视频中展示的关键 URL（复制粘贴用）

```
前端: https://autoyield-eight.vercel.app
API: https://autoyield-production.up.railway.app
GitHub: https://github.com/wanggang22/autoyield
npm: https://www.npmjs.com/package/autoyield-meme-scanner
Telegram Bot Code: https://github.com/wanggang22/autoyield-meme-monitor
```
