import fs from 'node:fs';
import path from 'node:path';

const USERPROFILE = process.env.USERPROFILE || 'C:\\Users\\admin';
const scriptPath = path.join(USERPROFILE, '.codex', 'skills', 'dsh-extension-guard', 'scripts', 'verify_dsh.mjs');

let code = fs.readFileSync(scriptPath, 'utf8');

// Ensure crypto imports include createHmac and createHash
code = code.replace(
  "import { randomUUID } from 'node:crypto';",
  "import { randomUUID, createHmac, createHash } from 'node:crypto';"
);

// Add getAuthHeaders helper
const helperCode = `function getAuthHeaders(targetPort) {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) return {};
    const credText = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const credDoc = yaml.parse(credText);
    const secretStr = credDoc?.records?.['client-connection/browser-session']?.payload?.secret;
    if (!secretStr) return {};

    const authority = \`127.0.0.1:\${targetPort}\`;
    const encodeBase64Url = (buf) => buf.toString('base64url');
    const signature = (sec, body) => createHmac('sha256', Buffer.from(sec, 'base64url')).update(body).digest();
    const encodeCookie = (payload, sec) => {
      const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
      return \`v1.\${body}.\${encodeBase64Url(signature(sec, body))}\`;
    };
    const cookieName = (auth) => 'dsh-auth-' + encodeBase64Url(createHash('sha256').update(auth).digest());

    const now = Date.now();
    const cookieVal = encodeCookie({
      version: 1,
      authority,
      issuedAt: now,
      expiresAt: now + 86400000 * 30
    }, secretStr);
    return {
      'Cookie': \`\${cookieName(authority)}=\${cookieVal}\`
    };
  } catch {
    return {};
  }
}

// 5. 实机无损无头健康探测
console.log('\\n--- 阶段 5: 实机无损无头健康探测 (Headless Probe) ---');

async function probeServer() {
  let child = null;
  let spawnedByUs = false;

  try {
    const authHeaders = getAuthHeaders(port);
    let alive = false;
    try {
      const ping = await fetch(\`http://127.0.0.1:\${port}\`, { headers: authHeaders });
      if (ping.status === 200 || ping.status === 401 || ping.status === 303) alive = true;
    } catch {}

    if (alive) {
      pass(\`检测到已有 DSH 实例正在监听 127.0.0.1:\${port}\`);
    } else {
      console.log(\`启动临时验证实例 (node \${DSH_BIN} web)...\`);
      child = spawn(process.execPath, [DSH_BIN, 'web'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });
      spawnedByUs = true;

      let childStderr = '';
      child.stderr?.on('data', (d) => (childStderr += d.toString()));

      const start = Date.now();
      let started = false;
      while (Date.now() - start < 25000) {
        try {
          const res = await fetch(\`http://127.0.0.1:\${port}\`, { headers: authHeaders });
          if (res.status === 200 || res.status === 401 || res.status === 303) {
            pass(\`临时实例成功启动并响应 HTTP \${res.status} (耗时: \${Date.now() - start}ms)\`);
            started = true;
            break;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!started) {
        fail(\`临时实例启动超时 (25s)！子进程错误日志:\\n\${childStderr || '无输出'}\`);
        return;
      }
    }

    let provData = null;
    const probeDeadline = Date.now() + 20000;
    while (Date.now() < probeDeadline) {
      try {
        const provRes = await fetch(\`http://127.0.0.1:\${port}/api/llm.providers\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            type: 'client-request',
            rpcId: randomUUID(),
            method: 'llm.providers',
            payload: {}
          })
        });
        if (provRes.status === 200) {
          const json = await provRes.json();
          if (json?.result?.ok) {
            provData = json;
            break;
          }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!provData) {
      fail('RPC 接口 /api/llm.providers 在等待超时内未就绪！');
      return;
    }
    const activeProviders = (provData?.result?.value?.providers || []).filter((p) => p.active);
    pass(\`激活的 Provider 列表 (\${activeProviders.length} 个): \${activeProviders.map((p) => p.provider).join(', ')}\`);

    if (activeProviders.length <= 1) {
      fail('警告：激活的 Provider 仅有 1 个或更少，说明第三方 Provider 挂载失败，发生提供方丢失故障！');
    }

    const modRes = await fetch(\`http://127.0.0.1:\${port}/api/llm.models\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: randomUUID(),
        method: 'llm.models',
        payload: {}
      })
    });`;

const probeSectionRegex = /\/\/ 5\. 实机无损无头健康探测[\s\S]*?const modRes = await fetch\(`http:\/\/127\.0\.0\.1:\${port}\/api\/llm\.models`,\s*\{[\s\S]*?headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\},[\s\S]*?body:\s*JSON\.stringify\(\{[\s\S]*?type:\s*'client-request',[\s\S]*?rpcId:\s*randomUUID\(\),[\s\S]*?method:\s*'llm\.models',[\s\S]*?payload:\s*\{\}[\s\S]*?\}\)[\s\S]*?\}\);/;

if (code.match(probeSectionRegex)) {
  code = code.replace(probeSectionRegex, helperCode);
  fs.writeFileSync(scriptPath, code, 'utf8');
  console.log('Successfully updated verify_dsh.mjs with auth cookie probing');
} else {
  console.log('probeSectionRegex did not match');
}
