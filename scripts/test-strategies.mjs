#!/usr/bin/env node
/**
 * Test all strategy types: steady-yield, smart-copy, custom
 * Uses x402 auto-payment. Requires AGENT_PRIVATE_KEY env var.
 */

import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const API = 'https://autoyield-production.up.railway.app';
const USDC = '0x74b7F16337b8972027F6196A17a631aC6dE26d22';
const PK = process.env.AGENT_PRIVATE_KEY;

if (!PK) {
  console.error('Set AGENT_PRIVATE_KEY env var');
  process.exit(1);
}

const account = privateKeyToAccount(PK.startsWith('0x') ? PK : `0x${PK}`);
const wallet = createWalletClient({
  account,
  chain: { id: 196, name: 'X Layer', rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } }, nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 } },
  transport: http(),
});

async function signX402(req) {
  const a = req.accepts ? req.accepts[0] : req;
  const validBefore = String(Math.floor(Date.now() / 1000) + 3600);
  const nonce = '0x' + [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
  const sig = await wallet.signTypedData({
    domain: { name: 'USD Coin', version: '2', chainId: 196, verifyingContract: USDC },
    types: { TransferWithAuthorization: [
      { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }
    ] },
    primaryType: 'TransferWithAuthorization',
    message: { from: account.address, to: a.payTo, value: BigInt(a.maxAmountRequired), validAfter: 0n, validBefore: BigInt(validBefore), nonce },
  });
  return Buffer.from(JSON.stringify({
    x402Version: req.x402Version || 1, scheme: a.scheme || 'exact', network: a.network || 'eip155:196',
    payload: { signature: sig, authorization: { from: account.address, to: a.payTo, value: String(a.maxAmountRequired), validAfter: '0', validBefore, nonce, asset: a.asset || USDC } },
  })).toString('base64');
}

async function testStrategy(strategyId, body = {}) {
  console.log(`\n${'═'.repeat(60)}\n🧪 测试: ${strategyId}\n${'═'.repeat(60)}`);
  const url = `${API}/api/strategy/start`;
  const payload = { strategyId, ...body };

  let res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (res.status === 402) {
    const req = JSON.parse(Buffer.from(res.headers.get('PAYMENT-REQUIRED'), 'base64').toString());
    console.log(`💳 付费 $0.05 USDC...`);
    const sig = await signX402(req);
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PAYMENT': sig }, body: JSON.stringify(payload) });
  }
  const data = await res.json();
  console.log(`✅ tx: ${data.payment?.transaction?.slice(0, 20)}...`);
  console.log(`🛠  Tools used (${data.toolsUsed?.length || 0}): ${(data.toolsUsed || []).join(', ')}`);
  console.log(`📊 Steps: ${data.stepsExecuted}`);
  console.log(`\n📝 结果:\n${data.result || ''}`);
}

console.log(`Wallet: ${account.address}`);
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('steady-yield')) await testStrategy('steady-yield');
if (args.length === 0 || args.includes('smart-copy')) await testStrategy('smart-copy');
console.log('\n✨ 测试完成');
