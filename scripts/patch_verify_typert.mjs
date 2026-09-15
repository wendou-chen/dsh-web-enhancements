import fs from 'node:fs';
import path from 'node:path';

const USERPROFILE = process.env.USERPROFILE || 'C:\\Users\\admin';
const scriptPath = path.join(USERPROFILE, '.codex', 'skills', 'dsh-extension-guard', 'scripts', 'verify_dsh.mjs');

let code = fs.readFileSync(scriptPath, 'utf8');

const oldProbeLogic = `    let provData = null;
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
    });
    const modData = await modRes.json();
    const groups = modData?.result?.value?.groups || [];
    const failures = modData?.result?.value?.failures || [];
    if (failures.length > 0) {
      fail(\`模型加载存在失败项: \${JSON.stringify(failures)}\`);
    } else {
      pass(\`所有模型分组均无错误，总分组数: \${groups.length}\`);
    }`;

const newProbeLogic = `    let provData = null;
    const probeDeadline = Date.now() + 20000;
    while (Date.now() < probeDeadline) {
      try {
        const provRes = await fetch(\`http://127.0.0.1:\${port}/api/llm/listProviders\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            type: 'client-request',
            rpcId: randomUUID(),
            method: 'llm/listProviders',
            payload: { args: {} }
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
      fail('RPC 接口 /api/llm/listProviders 在等待超时内未就绪！');
      return;
    }
    const providersList = provData?.result?.value || [];
    pass(\`激活的 Provider 列表 (\${providersList.length} 个): \${providersList.map((p) => p.id || p.name).join(', ')}\`);

    if (providersList.length <= 1) {
      fail('警告：激活的 Provider 仅有 1 个或更少，说明第三方 Provider 挂载失败，发生提供方丢失故障！');
    }

    const confRes = await fetch(\`http://127.0.0.1:\${port}/api/llm/listConfigurableProviders\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: randomUUID(),
        method: 'llm/listConfigurableProviders',
        payload: { args: {} }
      })
    });
    const confData = await confRes.json();
    const configProviders = confData?.result?.value || [];
    pass(\`可配置 Provider 列表探测正常，总数: \${configProviders.length} 个\`);`;

if (code.includes(oldProbeLogic)) {
  code = code.replace(oldProbeLogic, newProbeLogic);
  fs.writeFileSync(scriptPath, code, 'utf8');
  console.log('Successfully updated verify_dsh.mjs RPC probe methods to Typert protocol');
} else {
  console.log('Pattern not found');
}
