"""
AutoYield Meme Monitor — 替代 Bankr API
通过 x402 微支付调用 AutoYield API，分析 Solana meme 币，推送到 Telegram。

用法:
  pip install requests eth-account
  设置环境变量: TELEGRAM_TOKEN, CHAT_ID, MONITOR_PRIVATE_KEY
  python meme-monitor.py

费用: 每次调用 $0.05 USDC (x402 on X Layer)
"""

import requests
import json
import os
import sys
import logging
import time
import base64
import secrets
from datetime import datetime

# eth-account for EIP-712 signing
try:
    from eth_account import Account
    from eth_account.messages import encode_typed_data
except ImportError:
    print("请安装: pip install eth-account")
    sys.exit(1)

# ─── 配置 ───────────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
CHAT_ID = os.environ.get("CHAT_ID")
MONITOR_PK = os.environ.get("MONITOR_PRIVATE_KEY")  # X Layer 钱包私钥 (有 USDC)

AUTOYIELD_URL = os.environ.get("AUTOYIELD_URL", "https://autoyield-production.up.railway.app")

if not TELEGRAM_TOKEN:
    raise ValueError("请设置环境变量 TELEGRAM_TOKEN")
if not CHAT_ID:
    raise ValueError("请设置环境变量 CHAT_ID")
if not MONITOR_PK:
    raise ValueError("请设置环境变量 MONITOR_PRIVATE_KEY (X Layer 钱包私钥，需有 USDC)")

# 从私钥导出地址
acct = Account.from_key(MONITOR_PK)
WALLET_ADDRESS = acct.address
logger.info(f"Monitor 钱包: {WALLET_ADDRESS}")

# ─── x402 支付 ──────────────────────────────────────────────────────────────────

def x402_call(endpoint, params=None):
    """
    调用 AutoYield x402 API:
    1. 发起请求 → 收到 402
    2. 解析付费要求
    3. EIP-3009 签名授权 USDC 转账
    4. 带签名重放请求
    """
    url = f"{AUTOYIELD_URL}{endpoint}"
    if params:
        url += "?" + "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())

    logger.info(f"[x402] 请求: {url}")

    # Step 1: 发起请求，获取 402
    resp = requests.get(url, timeout=30)

    if resp.status_code != 402:
        # 不需要付费或出错
        if resp.ok:
            return resp.json()
        logger.error(f"[x402] 非402响应: {resp.status_code} {resp.text[:200]}")
        return None

    # Step 2: 解析付费要求
    payment_header = resp.headers.get("PAYMENT-REQUIRED") or resp.headers.get("payment-required")
    if payment_header:
        requirements = json.loads(base64.b64decode(payment_header).decode("utf-8"))
    else:
        requirements = resp.json()

    accept = requirements.get("accepts", [requirements])[0]
    pay_to = accept["payTo"]
    asset = accept["asset"]
    amount = accept.get("amount") or accept.get("maxAmountRequired")
    max_timeout = accept.get("maxTimeoutSeconds", 300)
    x402_version = requirements.get("x402Version", 1)

    logger.info(f"[x402] 需支付: {amount} → {pay_to}")

    # Step 3: EIP-3009 TransferWithAuthorization 签名
    nonce = "0x" + secrets.token_hex(32)
    valid_before = str(int(time.time()) + max_timeout)

    # USDC on X Layer 的 domain
    # 根据 asset 地址判断名称
    asset_lower = asset.lower()
    asset_names = {
        "0x74b7f16337b8972027f6196a17a631ac6de26d22": ("USD Coin", "2"),
        "0x779ded0c9e1022225f8e0630b35a9b54be713736": ("USD₮0", "2"),
        "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8": ("USDG", "2"),
    }
    asset_name, asset_version = asset_names.get(asset_lower, ("USD Coin", "2"))

    domain = {
        "name": asset_name,
        "version": asset_version,
        "chainId": 196,
        "verifyingContract": asset,
    }

    types = {
        "TransferWithAuthorization": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"},
            {"name": "validAfter", "type": "uint256"},
            {"name": "validBefore", "type": "uint256"},
            {"name": "nonce", "type": "bytes32"},
        ]
    }

    message = {
        "from": WALLET_ADDRESS,
        "to": pay_to,
        "value": int(amount),
        "validAfter": 0,
        "validBefore": int(valid_before),
        "nonce": bytes.fromhex(nonce[2:]),
    }

    # 签名
    signable = encode_typed_data(
        domain_data=domain,
        message_types=types,
        message_data=message,
    )
    signed = acct.sign_message(signable)
    signature = signed.signature.hex()
    if not signature.startswith("0x"):
        signature = "0x" + signature

    # Step 4: 构造 payment payload
    payment_payload = {
        "x402Version": x402_version,
        "scheme": accept.get("scheme", "exact"),
        "network": accept.get("network", "eip155:196"),
        "payload": {
            "signature": signature,
            "authorization": {
                "from": WALLET_ADDRESS,
                "to": pay_to,
                "value": str(amount),
                "validAfter": "0",
                "validBefore": valid_before,
                "nonce": nonce,
            },
        },
    }

    header_value = base64.b64encode(json.dumps(payment_payload).encode()).decode()
    header_name = "PAYMENT-SIGNATURE" if x402_version >= 2 else "X-PAYMENT"

    # Step 5: 带签名重放
    logger.info(f"[x402] 重放请求 ({header_name})...")
    replay = requests.get(url, headers={header_name: header_value}, timeout=180)

    if not replay.ok:
        logger.error(f"[x402] 重放失败: {replay.status_code} {replay.text[:300]}")
        return None

    result = replay.json()
    tx_hash = ""
    payment_resp = replay.headers.get("PAYMENT-RESPONSE")
    if payment_resp:
        try:
            pr = json.loads(base64.b64decode(payment_resp).decode())
            tx_hash = pr.get("transaction", "")
        except:
            pass

    logger.info(f"[x402] 成功! tx: {tx_hash}")
    return result


# ─── Meme 分析 Prompt ───────────────────────────────────────────────────────────

MEME_PROMPT = """请用中文回复。在 Solana 链上找出最有暴涨潜力的 meme 币。

你必须使用以下工具获取实时数据（不要凭空捏造）：
1. get_meme_tokens — 获取 Solana 新 meme 币列表
2. get_signals — 获取聪明钱/鲸鱼信号 (chain="501")
3. get_token_advanced_info — 获取代币详细信息（风险、开发者持仓、Top10集中度）
4. scan_token_security — 安全扫描
5. get_token_holders — 持币人分布
6. get_token_top_trader — 顶级交易者/KOL持仓

【核心筛选条件】（必须全部满足）：
- 市值 $50,000 - $500,000（小盘更容易拉升）
- 24小时成交量 > $10,000
- 成交量/市值比 > 50%（换手率高）
- 前10大持仓 < 20%（筹码分散，避免庄家控盘）
- 持币人 > 300（有真实社区基础）

【优先推荐】（按重要性排序）：
1. 🤡 荒诞但有趣的真实任务型代币 — 如 TOILET（社区众筹买马桶广告 10x）、Punch パンチ（领养动物 80x）
2. 😂 纯搞笑/无厘头/讽刺风格
3. 🌍 外文名/Unicode/emoji代币名 — 非英文名容易在英文圈传播引发好奇
4. 📈 换手率超高（24h成交量接近或超过市值）
5. 💎 筹码健康（前10持仓<15%最佳）
6. 🚀 有KOL持续推动

【警惕】：
- 试图讲"革命性技术"或"游戏/NFT应用"等正经故事的币
- 单一地址持仓>30%的

列出最值得关注的5个币，每个币必须包含以下10个字段：
1. 代币名称和符号
2. 合约地址（完整地址）
3. 当前价格
4. 市值
5. 24小时成交量
6. 成交量/市值比（换手率）
7. 24小时涨跌幅
8. 持币人数
9. 前10持仓占比
10. 🔥 叙事/热点说明（为什么可能爆发）

按暴涨潜力排序，最可能10倍的排第一。"""


# ─── Telegram 推送 ──────────────────────────────────────────────────────────────

def send_telegram(message: str):
    """发送 Telegram 消息"""
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    try:
        resp = requests.post(url, json={
            "chat_id": CHAT_ID,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }, timeout=30)
        resp.raise_for_status()
        logger.info("Telegram 消息发送成功")
        return True
    except Exception as e:
        logger.error(f"Telegram 发送失败: {e}")
        return False


def format_contract_addresses(text: str) -> str:
    """将合约地址格式化为可复制格式"""
    import re
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # Solana 地址
    text = re.sub(r'\b([1-9A-HJ-NP-Za-km-z]{32,44})\b', r'<code>\1</code>', text)
    # ETH 地址
    text = re.sub(r'\b(0x[a-fA-F0-9]{40})\b', r'<code>\1</code>', text)
    return text


# ─── 主流程 ─────────────────────────────────────────────────────────────────────

def check_and_notify():
    """查询热门 meme 币并推送"""
    logger.info("=" * 40)
    logger.info("开始查询热门 meme 币 (via AutoYield x402)...")

    result = None
    for attempt in range(3):
        result = x402_call("/api/strategy", {"q": MEME_PROMPT})
        if result:
            break
        logger.warning(f"第 {attempt + 1} 次查询失败，等待重试...")
        time.sleep(10)

    if not result:
        send_telegram(f"⚠️ AutoYield 查询失败（已重试3次）\n⏰ {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        return

    # 提取 AI 分析结果
    response_text = ""
    if isinstance(result, dict):
        response_text = result.get("analysis") or result.get("answer") or result.get("result") or ""
        if not response_text:
            # 尝试从嵌套结构提取
            for key in ["data", "response", "content"]:
                if key in result and isinstance(result[key], str):
                    response_text = result[key]
                    break
        if not response_text:
            response_text = json.dumps(result, ensure_ascii=False, indent=2)
    else:
        response_text = str(result)

    logger.info(f"获取到响应，长度: {len(response_text)}")

    # 格式化并推送
    response_text = format_contract_addresses(response_text)

    header = f"""
🔥 <b>Solana Meme 币精选 Top 5</b>
⏰ {datetime.now().strftime('%Y-%m-%d %H:%M')}
💰 数据源: AutoYield AI (x402 付费)

📋 筛选条件:
• 市值 $50K - $500K
• 成交量 &gt; $10K
• 前10持仓 &lt; 20%
• 持币人 &gt; 300

💡 点击合约地址可复制

━━━━━━━━━━━━━━━━━━━━

"""

    max_len = 3500
    if len(response_text) > max_len:
        send_telegram(header)
        time.sleep(1)
        chunks = [response_text[i:i+max_len] for i in range(0, len(response_text), max_len)]
        for i, chunk in enumerate(chunks[:5]):
            send_telegram(f"📊 第 {i+1} 部分:\n\n{chunk}")
            time.sleep(1)
    else:
        send_telegram(header + response_text)

    # 显示支付信息
    payment = result.get("payment", {}) if isinstance(result, dict) else {}
    if payment:
        tx = payment.get("transaction", "N/A")
        amt = payment.get("amount", "$0.05")
        send_telegram(f"💳 x402 支付: {amt} USDC\n🔗 TX: <code>{tx}</code>")

    logger.info("检查完成")


def main():
    """主函数 — 单次运行（由 GitHub Actions 定时触发）"""
    logger.info("=" * 50)
    logger.info("🚀 AutoYield Meme Monitor (x402)")
    logger.info(f"  钱包: {WALLET_ADDRESS}")
    logger.info(f"  API: {AUTOYIELD_URL}")
    logger.info("=" * 50)

    check_and_notify()
    logger.info("本次检查完成")


if __name__ == "__main__":
    main()
