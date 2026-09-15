import crypto from 'node:crypto';
import fs from 'node:fs';
import yaml from 'file:///C:/Users/admin/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/yaml/dist/index.js';
import { spawn } from 'node:child_process';

const USERPROFILE = process.env.USERPROFILE || 'C:\\Users\\admin';
const CREDENTIALS_PATH = 'C:\\Users\\admin\\.dsh\\.credentials.yaml';
const DSH_BIN = 'C:\\Users\\admin\\AppData\\Roaming\\npm\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js';

const credDoc = yaml.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const secretStr = credDoc?.records?.['client-connection/browser-session']?.payload?.secret;

function encodeBase64Url(buf) { return buf.toString('base64url'); }
function signature(sec, body) { return crypto.createHmac('sha256', Buffer.from(sec, 'base64url')).update(body).digest(); }
function encodeCookie(payload, sec) {
  const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return 'v1.' + body + '.' + encodeBase64Url(signature(sec, body));
}
function cookieName(authority) {
  return 'dsh-auth-' + encodeBase64Url(crypto.createHash('sha256').update(authority).digest());
}

const authority = '127.0.0.1:3080';
const now = Date.now();
const cookieVal = encodeCookie({
  version: 1,
  authority,
  issuedAt: now,
  expiresAt: now + 86400000 * 30
}, secretStr);
const authHeaders = {
  'Cookie': `${cookieName(authority)}=${cookieVal}`
};

const child = spawn(process.execPath, [DSH_BIN, 'web'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});

console.log('Waiting for server...');
for (let i = 0; i < 20; i++) {
  await new Promise(r => setTimeout(r, 1000));
  try {
    const ping = await fetch('http://127.0.0.1:3080/', { headers: authHeaders });
    if (ping.status === 200) {
      console.log('Server is up!');
      break;
    }
  } catch (e) {}
}

try {
  const res = await fetch('http://127.0.0.1:3080/api/llm/listProviders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    },
    body: JSON.stringify({
      type: 'client-request',
      rpcId: crypto.randomUUID(),
      method: 'llm/listProviders',
      payload: { args: {} }
    })
  });
  console.log('RPC response status:', res.status);
  const json = await res.json();
  console.log('RPC response json:', JSON.stringify(json, null, 2));
} catch (e) {
  console.error('RPC error:', e);
}

child.kill('SIGKILL');
