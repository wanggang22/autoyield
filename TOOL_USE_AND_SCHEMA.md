# Tool Use & Schema — AI Agent 的接口层 (Interface Layer)

> 学习笔记。记录 `tool_use` 和 `schema` 的机制、AutoYield 实际代码、三种架构对比，以及常见陷阱。

---

## 本文档在 Agent 架构中的位置

现代 AI Agent 有 **5 层基础结构**（完整总览见 [`AI_AGENT_ARCHITECTURE.md`](./AI_AGENT_ARCHITECTURE.md)）：

```
5. Orchestration Layer  (调度层)      — Planning, Multi-Agent
4. Memory Layer         (记忆层)      — RAG, Vector DB
3. Interface Layer      (接口层) ★    — ← 本文档聚焦这一层
2. Prompt Layer         (指令层)      — System Prompt, Skills
1. LLM Core             (大脑)        — Transformer
```

**本文档只讲第 3 层 Interface Layer**。要了解其他层，先读总览。

选这一层单独深入，是因为它是 Agent **最独特也最常用**的基础——没有它，AI 只能聊天；有了它，AI 才能"做事"。

---

## 一句话概括

- **`tool_use`** = AI 输出的"动作指令"，让 LLM 能调外部函数/API
- **`schema`** = 工具的"输入格式契约"，强制 AI 生成合法参数

两者缺一不可：
- 没 `tool_use` → AI 只能聊天，不能做事
- 没 `schema` → AI 会乱填参数，调用失败率暴涨

**这两块是 Interface Layer 的核心，让 AI 从"语言模型 (LLM)"进化到"智能体 (Agent)"能交互的关键**。

---

## 第一章：tool_use 的工作机制

### 1.1 没有 tool_use 的时代

```
User: 帮我查下 BTC 价格
AI:   请问你想查哪个交易所？（它只能编字）
```

LLM 本质是"文字接龙机器"，不能连数据库、不能发 HTTP、不能签交易。
早期解决方案：用正则从 AI 回答里抽命令。脆弱、低准确率、不可维护。

### 1.2 tool_use 出现后

AI 在输出中生成一段特殊 block：

```json
{
  "type": "tool_use",
  "id": "toolu_01abc",
  "name": "get_token_price",
  "input": { "token": "BTC" }
}
```

运行时看到这段 → 真正执行 `get_token_price({token: "BTC"})` → 返回结果：

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01abc",
  "content": "{ \"price\": 72150.42, \"change_24h\": 2.3 }"
}
```

结果塞回给 AI 作为新一轮上下文 → AI 继续推理或再调工具，直到任务完成。

### 1.3 多轮 Agentic 循环

```
Round 1: AI 看到 query "找 meme 币" → 调 get_meme_tokens
Round 2: AI 看到 20 个 token → 对高风险的调 scan_token_security (parallel)
Round 3: AI 看到安全扫描结果 → 过滤出 3 个 → 调 get_token_info 详查
Round 4: AI 综合信息 → 输出最终 buy list (不再调工具)
```

AutoYield 的 `agent-server.mjs` 限制最多 20 轮 (`MAX_ROUNDS`)，避免无限循环。

---

## 第二章：schema 是什么

### 2.1 Schema 的结构

Schema 基于 **JSON Schema Draft 7** 标准，告诉 AI 每个工具：
- **叫什么** (`name`)
- **干什么** (`description`)
- **需要什么参数** (`input_schema`)

### 2.2 最小完整例子

```js
{
  name: 'get_token_price',
  description: 'Get current price of a token',
  input_schema: {
    type: 'object',
    properties: {
      token: {
        type: 'string',
        description: 'Token name or symbol, e.g. BTC, PEPE, ETH'
      }
    },
    required: ['token']
  }
}
```

AI 看到这个定义，**保证生成**：
```json
{ "token": "BTC" }   // ✅ 符合 schema
```

不会生成：
```json
{ "token_name": "BTC" }       // ❌ 字段名错
{ "ticker": "BTC" }           // ❌ 字段名错
{ "token": 123 }              // ❌ 类型错
{}                            // ❌ 缺 required 字段
```

### 2.3 Schema 的强约束能力

现代 LLM 在 tool_use 模式下使用 **约束解码 (Constrained Decoding)**：
- 每生成一个 token 前，先看 schema 允许哪些 token
- 概率上直接屏蔽不合法分支
- 所以输出**一定符合 schema**（不是"概率符合"，是硬约束）

这是为什么 tool_use 的可靠性比早期"让 AI 输出 JSON 字符串"高一个数量级。

---

## 第三章：AutoYield 的实际例子

### 3.1 工具定义（来自 scripts/agent-server.mjs）

```js
const TOOLS = [
  {
    name: 'get_token_price',
    description: 'Get current price of a token',
    input_schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token name or symbol' }
      },
      required: ['token']
    }
  },
  {
    name: 'scan_token_security',
    description: 'Check token for honeypot/rug risk before trading',
    input_schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token address or symbol' },
        chain: { type: 'string', description: 'Chain index, default "1"' }
      },
      required: ['token']
    }
  },
  {
    name: 'dual_engine_quote',
    description: 'Compare OKX DEX + Uniswap quotes in parallel',
    input_schema: {
      type: 'object',
      properties: {
        from_token: { type: 'string' },
        to_token:   { type: 'string' },
        amount:     { type: 'string', description: 'Amount in wei' }
      },
      required: ['from_token', 'to_token', 'amount']
    }
  }
  // ... 共 22 个
];
```

### 3.2 交给 Claude

```js
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 4096,
  tools: TOOLS,              // ← 全部 schema 传给 AI
  messages: conversationHistory
});
```

### 3.3 解析 tool_use 并执行

```js
for (const block of response.content) {
  if (block.type === 'tool_use') {
    const result = await executeTool(block.name, block.input);
    conversationHistory.push({
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result)
      }]
    });
  }
}

// 再次调用 AI 让它继续推理
```

### 3.4 典型一次完整对话

```
User:   "帮我找今天 Solana 新 meme"

Claude: [tool_use] get_meme_tokens({chain:"501", stage:"NEW"})
System: [tool_result] 返回 50 个 token

Claude: [tool_use] scan_token_security({token:"xxx", chain:"501"})
        [tool_use] scan_token_security({token:"yyy", chain:"501"})   // 并行
        [tool_use] scan_token_security({token:"zzz", chain:"501"})
System: [tool_result] × 3 个扫描结果

Claude: [text] "根据扫描和成交量，推荐这 3 个：..."
```

---

## 第四章：Schema 质量决定调用成功率

### 4.1 好 schema vs 差 schema

❌ **差的 schema（AI 调用成功率低）**：
```js
{
  name: 'swap',
  description: 'Swap tokens',
  input_schema: {
    type: 'object',
    properties: {
      params: { type: 'object' }      // ← 黑盒，AI 靠猜
    }
  }
}
```

✅ **好的 schema（约束细、描述准）**：
```js
{
  name: 'swap',
  description: 'Swap tokens via OKX DEX on X Layer. Quote is valid for 30s.',
  input_schema: {
    type: 'object',
    properties: {
      from_token: {
        type: 'string',
        pattern: '^0x[a-fA-F0-9]{40}$',
        description: 'ERC-20 address, e.g. 0x... (USDC on X Layer)'
      },
      to_token: {
        type: 'string',
        pattern: '^0x[a-fA-F0-9]{40}$'
      },
      amount: {
        type: 'string',
        description: 'Amount in minimal units (wei). 1 USDC = "1000000" (6 decimals)'
      },
      slippage: {
        type: 'number',
        minimum: 0.001, maximum: 0.1,
        description: 'Slippage tolerance 0.001-0.1 (0.1%-10%). Default 0.01'
      }
    },
    required: ['from_token', 'to_token', 'amount']
  }
}
```

### 4.2 Description 的重要性

**Description 是 AI 的"用户手册"。** 规则：
- 写清"什么时候用这个工具"（帮 AI 选）
- 标注单位、默认值、陷阱（帮 AI 填参数）
- 提示边界条件（"Quote 30 秒失效"）

AutoYield 里的例子：
```js
{
  name: 'get_meme_tokens',
  description: 'Get trending meme tokens. Use for "find meme" / "new token" queries.',
  input_schema: {
    properties: {
      chain: { description: 'Chain index, default "501" (Solana). Use "1" for ETH.' },
      stage: { description: '"NEW" (< 24h), "GRADUATING" (> 50% bonded), "GRADUATED"' }
    }
  }
}
```

---

## 第五章：三种架构下的 tool_use + schema

| 架构 | tool_use 谁产生？ | schema 谁用？ | 成本 |
|------|-----------------|--------------|------|
| **AI 全包** | Claude 自己规划调用链 | Claude 阅读 + 填参数 | 高（18K system + 多轮）|
| **JS 编排** | 程序员写死调用链 | JS 代码直接调（不用 schema） | 低（无 AI 规划） |
| **精细插入** | 关键节点小 AI 调（如 parseRule） | 小 AI 看窄 schema | 很低（1-2K/次） |

### 5.1 AI 全包示意

```js
// Claude 决定先查安全，再查价格，再对比
const tools = [scan_security, get_price, dual_quote, ...];
await anthropic.messages.create({ tools, messages });
// 完全由 AI 规划 20 轮循环
```

### 5.2 JS 编排示意

```js
// 程序员写死的流程，tool_use 变成函数调用
async function findMeme(query) {
  const list = await getMemeTokens('501', 'NEW');
  const safe = await Promise.all(list.map(t =>
    scanTokenSecurity(t.address, '501')
  ));
  return safe.filter(r => r.safe).slice(0, 5);
}
```

### 5.3 精细插入示意

```js
// JS 主流程，但 parseRule / reason 用小 AI
async function findMeme(query) {
  // 🤖 窄 AI：解析模糊需求
  const rule = await parseRuleWithHaiku(query, PARSE_SCHEMA);

  // JS：硬规则过滤
  const list = await getMemeTokens(rule.chain, rule.stage);
  const safe = list.filter(t => t.marketCap >= rule.mcRange[0]);

  // 🤖 窄 AI：生成自然语言理由
  const reason = await generateReasonWithHaiku(safe, REASON_SCHEMA);
  return { tokens: safe, reason };
}
```

**关键观察**：不管哪种架构，**schema 都是契约核心**。只是"读 schema 的主体"从 AI 变成了 JS 程序员。

---

## 第六章：厂商兼容性

### 6.1 三大 LLM 都支持同一套标准

| 厂商 | 术语 | 字段名 |
|------|------|--------|
| Anthropic | `tool_use` | `tools[].input_schema` |
| OpenAI    | `function_call` | `tools[].function.parameters` |
| Google    | `function_call` | `tools[].function_declarations[].parameters` |

**schema 格式完全一致**（都是 JSON Schema）。只需要包一层字段名转换，同一套工具可以跨厂商用。

### 6.2 MCP (Model Context Protocol)

Anthropic 牵头的**跨厂商标准**，本质是"tool_use + schema 的标准化打包"：

```
你的服务 (MCP Server)
  ↓ 暴露 tool list + schema (JSON-RPC over stdio/HTTP)
Claude Desktop / VS Code / Cursor / 任意 AI 客户端
  ↓ 通过 MCP 协议调用你的工具
```

AutoYield 的 `mcp-package/mcp-server.mjs` 就是这个模式：
- 对外暴露 `meme_scan` 工具 + schema
- 任何支持 MCP 的 AI 都能直接调用
- 用户 `npx autoyield-meme-scanner` 就能给 Claude Desktop 装上

### 6.3 Schema 是 AI 生态的"通用语"

- AI ↔ 工具：schema 定义交互
- AI ↔ AI (A2A)：schema 定义协作接口
- AI ↔ 人类开发者：schema 是 API 文档

**学好 JSON Schema = 学好 AI Agent 开发的一半**。

---

## 第七章：常见陷阱

### 7.1 ❌ 工具太多导致 AI 选错

超过 20+ 工具时，AI 容易选错。解决方案：
- 分组，把工具分成 `safety / trading / info / wallet` 子集，按场景注入
- 命名清晰：`scan_token_security` > `check` > `validate`
- description 里写"用于 XX 场景"

### 7.2 ❌ required 太多

把所有字段都写 required，AI 会在没信息时拒绝调用或瞎填。正确：
- 只必填真正不能省的
- 其他靠 default value + description 提示

### 7.3 ❌ description 只写了参数类型

差：`{ amount: { type: 'string' } }`
好：`{ amount: { type: 'string', description: 'Amount in wei (minimal units). USDC has 6 decimals, so 1 USDC = "1000000"' } }`

AI 看到好的 description 才不会把 "1.5 USDC" 直接塞进去。

### 7.4 ❌ 返回结果太大

工具返回 10K token 的 JSON，AI 看完再调下一个工具又花钱又慢。正确：
- 工具内部裁剪
- 只返回 AI 需要的字段
- 大数据放 URL 让 AI 按需读

### 7.5 ❌ 把 schema 当文档

Schema 是机器约束，description 是 AI 的"提示词"。别在 description 里写长篇教程，反而让 AI 分心。1-2 句点到为止。

### 7.6 ❌ 忘了 tool_result 必须匹配 tool_use_id

每个 tool_use block 有个 id（`toolu_xxx`），tool_result 必须通过 `tool_use_id` 字段配对，否则 AI 会懵。

---

## 第八章：学习路径

### 入门
1. 读 Anthropic 官方 [tool_use guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
2. 实现一个 Hello World：定义一个 `get_time()` 工具让 Claude 调用

### 进阶
3. 读本项目的 `scripts/agent-server.mjs:740-900` — 22 个工具的 schema 定义
4. 读 `scripts/agent-server.mjs` 里的 `executeTool()` 函数 — 怎么把 tool_use 翻译成真实调用
5. 理解 MAX_ROUNDS 循环 — 多轮 Agent 怎么编排

### 高阶
6. 读本项目 `ARCHITECTURE_REPORT.md` — 三种架构的取舍
7. 看 MCP 协议：`mcp-package/mcp-server.mjs`
8. 自己写个 MCP Server 发 npm，让 Claude Desktop 能用

### 深入原理
9. Constrained Decoding 论文（为什么 AI 输出"一定"符合 schema）
10. JSON Schema 标准 (https://json-schema.org/) — 掌握 anyOf / oneOf / enum / pattern

---

## 关键洞察

> **tool_use + schema 不是"AI 的实现细节"，是"AI 和真实世界的接口标准"。**

- AI 只需要会**生成合法 JSON**，不需要懂你业务
- 业务逻辑在工具里（由你/JS 实现）
- 架构演进 = 重新划分"AI 做的部分" vs "工具做的部分"
- Schema 是这个边界上的契约，永远不变

学好这两块，迁移到 GPT / Gemini / 其他 LLM 都是小改动，**核心认知可以复用 10 年**。

---

## 相关文档

### 本知识库
- **[`AI_AGENT_ARCHITECTURE.md`](./AI_AGENT_ARCHITECTURE.md)** — Agent 5 层基础结构总览（本文档的上位文档）
- **[`ARCHITECTURE_REPORT.md`](./ARCHITECTURE_REPORT.md)** — AI 全包 vs JS 编排 vs 精细插入的完整对比
- `scripts/agent-server.mjs` — 22 个工具的完整 schema 实现
- `mcp-package/mcp-server.mjs` — MCP 标准的实际应用

### 外部资源
- https://docs.anthropic.com/en/docs/build-with-claude/tool-use — Anthropic 官方文档
- https://modelcontextprotocol.io/ — MCP 协议官网
- https://json-schema.org/ — JSON Schema 标准
