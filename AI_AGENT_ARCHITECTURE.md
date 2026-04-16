# AI Agent Architecture — 5 层基础结构总览

> 学习笔记。系统梳理现代 AI Agent 的完整基础结构，每层的作用、关键技术、代表工具。作为 AI 知识库入口文档。

---

## 为什么要分层理解 Agent？

初学者容易把 "AI Agent" 当成一个黑盒，以为就是"调用 GPT/Claude API"。实际上，一个生产级 Agent 是**多层堆叠**的系统——就像理解 Web 开发必须区分"浏览器 / HTTP / 后端 / 数据库"四层一样，理解 Agent 必须区分大脑、指令、接口、记忆、调度五层。

**分层的好处**：
- 排查问题快 — 知道哪层出的问题（AI 回答错 vs 工具调用错 vs 记忆丢失）
- 选型清晰 — 每层有不同工具可选（Vector DB 选哪个？和 LLM 无关）
- 学习有路径 — 一层一层深入，不会被全栈吓退

---

## 完整结构图

```
┌──────────────────────────────────────────────────────────┐
│  横切关注点 (Cross-cutting Concerns)                       │
│  Guardrails · Observability · Evaluation · Safety · Cost  │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  5. Orchestration Layer  (调度层)                          │
│     Planning · Multi-Agent · Workflow · State Machine     │
│                                                            │
│  4. Memory Layer         (记忆层)                          │
│     Short-term · RAG · Long-term Memory · Knowledge Graph │
│                                                            │
│  3. Interface Layer      (接口层)                          │
│     Tool Use · Schema · MCP · Structured Output           │
│                                                            │
│  2. Prompt Layer         (指令层)                          │
│     System Prompt · Skills · Few-shot · Prompt Cache      │
│                                                            │
│  1. LLM Core             (大脑)                            │
│     Transformer · Context Window · Attention              │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**依赖关系**：下层是上层的基础，但上层可以跳过中间层直接用下层。
例如简单的 chatbot 只用第 1+2 层；复杂 Agent 才需要全部 5 层。

---

## 第 1 层：LLM Core（大脑）

### 是什么
底层语言模型本身。所有能力的源头。

### 核心组件
- **Transformer 架构** — 2017 年 Google "Attention is All You Need" 论文
- **Attention 机制** — 让模型关注上下文相关 token
- **Context Window** — 一次能看多少 token
  - Claude Opus 4.6: 1M tokens（1048576）
  - Claude Sonnet: 200K
  - GPT-4o: 128K
  - Gemini 1.5 Pro: 2M
- **参数规模** — 决定推理能力天花板

### 技术细节
- **Tokenization** — 文字被切成 token，不同模型 tokenizer 不同
- **Temperature** — 控制输出随机性（0 = 确定，1+ = 创造性）
- **Top-p / Top-k** — 采样策略
- **Logit Bias** — 强制偏好某些 token

### 代表模型（2026 年）
| 厂商 | 旗舰 | 性价比 | 最新日期 |
|------|------|-------|----------|
| Anthropic | Claude Opus 4.6 | Claude Haiku 4.5 | 2025 Q4 |
| OpenAI | GPT-5 | GPT-5-mini | 2025 |
| Google | Gemini 2.0 Pro | Gemini 2.0 Flash | 2025 |
| Meta | Llama 4 | — | 开源 |

### 学习资源
- 《Attention is All You Need》原论文
- Andrej Karpathy "Let's build GPT from scratch"
- Anthropic Interpretability Research

---

## 第 2 层：Prompt Layer（指令层）

### 是什么
给 AI 注入**身份、规则、知识、示范**的方式。让通用 LLM 变成特定 Agent。

### 核心组件

#### System Prompt
整段文字定义 AI 的角色和行为：
```
"You are AutoYield Meme Hunter. Your job is to find profitable
meme tokens on Solana. You MUST scan security before any trade..."
```

#### Skills / Modular Prompts
模块化的 system prompt 片段。OpenAI GPTs、Claude Skills、OKX OnchainOS Skills 都是这个模式。

AutoYield 用了 8 个 OKX Skills（memePulse, TwitterSignals, TokenSecurity 等），每个 SKILL.md 是一份模块化指令。

#### Few-shot Learning
在 prompt 里直接给 AI 看示范：
```
User: $BONK analysis
AI: [Security] ✅ Safe. [Momentum] High. [Verdict] BUY.

User: $PEPE analysis
AI: ...（AI 会按上面的格式继续）
```

#### Prompt Caching
Anthropic/OpenAI 都支持：重复的 system prompt 可缓存 5 分钟，命中后费用降 90%。
AutoYield 原本系统 prompt 18K tokens，靠 caching 把每次成本从 $1.2 降到 $0.12。

### 设计原则
- **Role-first** — "你是谁" 比 "你做什么" 更有效
- **Rule explicit** — "MUST / MUST NOT / SHOULD" 而不是暗示
- **Example over instruction** — 示范一次比解释十次管用
- **Avoid negation** — "Don't do X" 比 "Do Y" 弱，尽量转正向

### 代表工具/平台
- **OpenAI GPTs** — 通过对话生成 system prompt
- **Claude Projects** — 长期 system prompt + 知识库
- **Anthropic Skills** — 官方模块化 prompt 标准（就是你在用的这种）
- **Promptfoo** — prompt 版本管理 + A/B 测试

### AutoYield 里的实现
- `scripts/agent-server.mjs` 的 `generateCustomStrategyPrompt()` 函数
- `skills/*/SKILL.md` 每个 Skill 的模块化内容
- 系统 prompt 启用了 `cache_control: { type: "ephemeral" }`

### 学习资源
- Anthropic Prompt Engineering Guide
- OpenAI Cookbook
- "Prompt Engineering for Developers" (DeepLearning.AI)

---

## 第 3 层：Interface Layer（接口层） ★

### 是什么
AI 与**外部世界**交互的标准化接口。让 AI 从"会说话"变成"会做事"。

### 核心组件
- **Tool Use** — AI 生成结构化动作指令
- **Schema** — JSON Schema 约束工具参数
- **MCP** — 跨厂商的工具协议
- **Structured Output** — 强制 AI 返回合法 JSON

### 为什么关键
这是 Agent **最独特的层**——前 AI 时代不存在。
前 2 层是"让 AI 聪明"，这层是"让 AI 能动手"。

### 本文档不展开
完整细节见 **[`TOOL_USE_AND_SCHEMA.md`](./TOOL_USE_AND_SCHEMA.md)** — 400 行专门讲这一层。

### AutoYield 里的实现
- 22 个工具定义（`scripts/agent-server.mjs` L740-900）
- MCP Server 包装（`mcp-package/mcp-server.mjs`）

---

## 第 4 层：Memory Layer（记忆层）

### 是什么
AI 的 context window 有限（就算 1M 也有限）。生产 Agent 必须有**外部记忆系统**持久化信息。

### 记忆的 4 种类型

#### 短期记忆 (Short-term / Working Memory)
- 存在哪：当前 context window
- 生命周期：单次对话
- 机制：对话消息数组

#### 语义记忆 (Semantic Memory) — 最常见
- 存在哪：向量数据库
- 生命周期：长期
- 机制：Embedding + Vector Search
- 用途：知识检索，RAG 的主力

#### 情景记忆 (Episodic Memory)
- 存在哪：事件日志 + 索引
- 生命周期：长期
- 机制：时间戳 + 事件结构
- 用途："用户上次说过什么"

#### 程序性记忆 (Procedural Memory)
- 存在哪：工作流定义
- 生命周期：长期
- 机制：预定义 playbook
- 用途："遇到 X 情况，总是按 Y 流程处理"

### RAG (Retrieval Augmented Generation)
最主流的记忆模式：
```
用户 query
  ↓ Embedding
  ↓ Vector DB 检索 top-K 相关文档
  ↓ 拼回 system prompt / user message
  ↓
LLM 基于这些文档回答
```

### 关键技术
- **Embedding 模型** — 把文本变成向量
  - OpenAI text-embedding-3-large
  - Cohere embed-v3
  - Voyage AI voyage-3
- **Vector Database** — 存向量 + 相似度搜索
  - 托管：Pinecone、Weaviate、Qdrant Cloud
  - 自托管：Chroma、Qdrant、Milvus
  - 集成：pgvector (Postgres)、Redis Stack
- **Chunking Strategy** — 文档怎么切（固定长度 vs 语义分块 vs 结构化分块）
- **Hybrid Search** — 向量搜索 + 关键词 (BM25) 组合
- **Reranking** — 召回后精排（Cohere Rerank / Voyage Rerank）

### 代表工具
- **LangChain / LlamaIndex** — RAG 框架
- **Mem0** — Agent 专用记忆层
- **Zep** — 带时序的记忆系统
- **Letta (MemGPT)** — 分层记忆，学术派
- **Claude 内置记忆** — 你我现在在用的 `MEMORY.md` 机制

### AutoYield 里的实现
- **短期**：每次 x402 请求是一次新对话，无状态
- **语义**：没用（业务不需要 — 价格/持仓是实时的）
- **用户偏好**：localStorage 存钱包选择
- **Claude 记忆**：`~/.claude/.../memory/` 存我的长期笔记

### 学习资源
- LlamaIndex "Build a RAG System" 课程
- Pinecone 官方 RAG 指南
- "Advanced RAG Techniques" by Wenqi Glantz

---

## 第 5 层：Orchestration Layer（调度层）

### 是什么
**多个 AI 调用 / 多个 Agent** 的协同规划。单次 tool_use 循环处理不了的复杂任务靠这层。

### 核心模式

#### Planning (ReAct Pattern)
AI 先"思考"再"行动"，循环：
```
Thought: 用户要找便宜且安全的 meme
Action: scan_security(top 10 tokens)
Observation: 3 个安全
Thought: 对这 3 个查成交量
Action: get_volume(...)
...
```
Claude 3.7+ 的 **Extended Thinking** 就是内置的 ReAct。

#### Chain of Thought (CoT)
强制 AI 在回答前写出推理步骤。简单但有效。

#### Multi-Agent Coordination
多个 Agent 分工：
- **Supervisor 模式**：一个 Agent 管理其他 Agent
- **Hierarchical 模式**：CEO → 经理 → 员工
- **Swarm 模式**：Agent 之间对等协作
- **Handoff 模式**：任务在 Agent 间传递

AutoYield 就是 multi-agent：
- Server Agent（处理 x402 请求）
- Meme Monitor Bot（定时扫描推 Telegram）

#### Workflow Engines
把 Agent 任务建模成**状态图**：
```
[开始] → [扫描] → [安全检查] → [通过?] → [买入] → [结束]
                                  ↓ No
                              [拒绝] → [结束]
```

#### A2A (Agent-to-Agent)
Agent 之间用 x402 / API 互相调用和付费。
AutoYield MCP 包就是让别的 Agent 能调用我们的 Agent。

### 代表框架
- **LangGraph** — 状态图 + workflow，生产级
- **CrewAI** — Multi-Agent 协作，类比"团队"
- **AutoGen** (Microsoft) — Agent 对话式协作
- **Swarm** (OpenAI) — 轻量 handoff 模式
- **Temporal** — 持久化 workflow 引擎
- **Vercel AI SDK** — UI 集成的 workflow

### AutoYield 里的实现
- `agent-server.mjs` 的 MAX_ROUNDS 循环 = 最简 ReAct
- Claude tool_use parallel execution = 并行 Agent 动作
- Meme Monitor cron = 简单 workflow scheduler

### 学习资源
- LangGraph 官方教程
- "Building Agents with LLM" by Harrison Chase
- ReAct 原论文 (Yao et al., 2022)

---

## 横切关注点（Cross-cutting Concerns）

这些不属于某一层，而是**贯穿所有层**的基础设施。

### Guardrails（护栏）
防止 AI 说/做错话。
- **输入过滤**：prompt injection 检测、PII 脱敏
- **输出检查**：敏感词过滤、合规审查
- **工具白名单**：危险工具需要二次确认
- 代表：Lakera、NeMo Guardrails、Guardrails AI、Anthropic Constitutional AI

### Observability（可观测性）
生产 Agent 的"心电图"。
- **Tracing**：每次 AI 调用的完整链路（输入→工具→输出）
- **Logging**：结构化日志
- **Metrics**：token 消耗、延迟、成功率
- **Debugging**：回放失败的 session
- 代表：LangSmith、LangFuse、Helicone、Arize Phoenix、OpenTelemetry

### Evaluation（评估）
AI 的"单元测试"。
- **Offline Eval**：黄金数据集跑准确率
- **Online Eval**：A/B 测试
- **LLM-as-Judge**：让另一个 AI 评判输出质量
- **Human-in-the-loop**：关键场景人工审核
- 代表：Braintrust、Promptfoo、Ragas (RAG 专用)、Langfuse Evals

### Safety（安全）
防止 AI 被滥用。
- **越狱防护**：防止绕过 system prompt
- **Red Teaming**：主动攻击测试
- **RLHF / Constitutional AI**：训练阶段对齐
- **对抗鲁棒性**：对付 adversarial prompt
- 代表：Anthropic RSP、OpenAI Preparedness、Llama Guard

### Cost Management（成本管理）
- **模型路由**：简单 query 用 Haiku，复杂用 Opus
- **Prompt Caching**：重复 prompt 缓存
- **Semantic Caching**：相似 query 走缓存
- **Rate Limiting**：保护预算
- 代表：Portkey、Helicone、自研

---

## AutoYield 项目在各层的覆盖度

| 层 | 实现度 | 关键文件 |
|----|--------|---------|
| 1. LLM Core | ✅ Claude Sonnet 4 | Anthropic SDK |
| 2. Prompt Layer | ✅ 8 Skills + Prompt Cache | `generateCustomStrategyPrompt()` |
| 3. Interface Layer | ✅ 22 Tools + MCP | `agent-server.mjs`, `mcp-server.mjs` |
| 4. Memory Layer | 🟡 仅 localStorage | 无 Vector DB（业务不需要） |
| 5. Orchestration | 🟡 Multi-Agent (2 个) | Server Agent + Monitor Bot |
| Guardrails | ✅ x402 付费防滥用 | EIP-3009 签名验证 |
| Observability | 🟡 Railway 日志 | 无 tracing |
| Evaluation | ❌ 无 | — |
| Cost Mgmt | ✅ Prompt Cache | — |

---

## 学习路径

### 🟢 入门（1-2 周）
- [ ] LLM Core 基本概念（Transformer, Context Window）
- [ ] Prompt Engineering 基础
- [ ] 跑通 `hello world` Chatbot（OpenAI/Claude API）

### 🟡 初级（2-4 周）
- [ ] **Interface Layer 深入** → 读 `TOOL_USE_AND_SCHEMA.md`
- [ ] 实现一个带工具的 Agent（查天气 / 查数据库）
- [ ] 学 MCP，写一个自己的 MCP Server

### 🟠 中级（1-2 个月）
- [ ] RAG 系统（Embedding + Vector DB + 召回）
- [ ] Prompt Caching 降本
- [ ] Structured Output 实战
- [ ] 基础 Observability（LangSmith）

### 🔴 高级（2-6 个月）
- [ ] Multi-Agent 编排（LangGraph）
- [ ] ReAct + Extended Thinking
- [ ] Memory Systems (Mem0 / Zep)
- [ ] A/B Testing + Eval Pipeline

### ⚫ 生产级（持续）
- [ ] Guardrails 全套
- [ ] Cost optimization
- [ ] 多模型路由
- [ ] SLA & 监控告警

---

## 架构演进路线

```
阶段 1: Prompt Only
  └─ 纯 LLM + System Prompt，就是个聊天机器人

阶段 2: + Tool Use
  └─ 加工具，能做事了。这是大部分 Agent 的起点

阶段 3: + Memory (RAG)
  └─ 加向量库，能记住专属知识

阶段 4: + Multi-Agent
  └─ 多个 Agent 协作，处理复杂任务

阶段 5: + Guardrails + Observability
  └─ 生产级，可以商业化
```

**大部分项目卡在阶段 2 → 3 的过渡**（引入 RAG 的复杂度骤增）。

---

## 相关文档

### 本知识库
- **本文** `AI_AGENT_ARCHITECTURE.md` — 5 层总览（你在这）
- **[`TOOL_USE_AND_SCHEMA.md`](./TOOL_USE_AND_SCHEMA.md)** — 接口层深入
- **[`ARCHITECTURE_REPORT.md`](./ARCHITECTURE_REPORT.md)** — AI 全包 vs JS 编排架构决策

### 外部核心资源
- Anthropic: https://docs.anthropic.com/en/docs/
- OpenAI Cookbook: https://cookbook.openai.com/
- LangChain Concepts: https://python.langchain.com/docs/concepts/
- MCP: https://modelcontextprotocol.io/
- Papers With Code LLM Agents: https://paperswithcode.com/task/llm-agents

### 推荐书/课
- 《Building LLM Apps》— Valentina Alto
- DeepLearning.AI "AI Agents in LangGraph" (Harrison Chase)
- Stanford CS336 "Large Language Models"

---

## 核心洞察

> **5 层不是"必须都有"，而是"可以有"。根据业务选择深度。**

- 做个聊天机器人 → 第 1+2 层
- 做个查数据的 Assistant → + 第 3 层（AutoYield 当前）
- 做个懂你知识的 Copilot → + 第 4 层
- 做个能执行复杂任务的 Agent → + 第 5 层
- 做 To B 产品 → + 横切层全套

**先做出 MVP，再按需加层**。过早堆全栈是很多 Agent 项目失败的主因。
