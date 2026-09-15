import fs from 'node:fs';
import path from 'node:path';

const USERPROFILE = process.env.USERPROFILE || 'C:\\Users\\admin';
const scriptPath = path.join(USERPROFILE, '.codex', 'skills', 'dsh-extension-guard', 'scripts', 'verify_dsh.mjs');

let code = fs.readFileSync(scriptPath, 'utf8');

const targetStr = `  if (changed) {
    fs.writeFileSync(tokenUsageClient, tuCode, 'utf8');
    pass('dsh-token-usage 前端依赖已完成自动自愈');
  } else {
    pass('dsh-token-usage 前端脚本纯净度正常');
  }
}`;

const addition = `  if (changed) {
    fs.writeFileSync(tokenUsageClient, tuCode, 'utf8');
    pass('dsh-token-usage 前端依赖已完成自动自愈');
  } else {
    pass('dsh-token-usage 前端脚本纯净度正常');
  }
}

// 自动检测并自愈 @opencode2dsh/dsh-plugin 缺少 options.id 缺陷
const opencodePluginClient = path.join(PROFILE_WEB_DIR, 'node_modules', '@opencode2dsh', 'dsh-plugin', 'lib', 'client.js');
if (fs.existsSync(opencodePluginClient)) {
  let ocCode = fs.readFileSync(opencodePluginClient, 'utf8');
  if (ocCode.includes('name: "settings.plugin.item"') && !ocCode.includes('id: SETTINGS_NAMESPACE')) {
    heal('检测到 @opencode2dsh/dsh-plugin 注册 settings.plugin.item 缺少 options.id，正在自愈修补...');
    ocCode = ocCode.replace(
      'name: "settings.plugin.item",\\n\\t\\t\\tkey: SETTINGS_NAMESPACE,',
      'name: "settings.plugin.item",\\n\\t\\t\\tid: SETTINGS_NAMESPACE,\\n\\t\\t\\tkey: SETTINGS_NAMESPACE,'
    ).replace(
      'name: "settings.plugin.item",\\r\\n\\t\\t\\tkey: SETTINGS_NAMESPACE,',
      'name: "settings.plugin.item",\\r\\n\\t\\t\\tid: SETTINGS_NAMESPACE,\\r\\n\\t\\t\\tkey: SETTINGS_NAMESPACE,'
    );
    fs.writeFileSync(opencodePluginClient, ocCode, 'utf8');
    pass('@opencode2dsh/dsh-plugin settings.plugin.item options.id 补丁已修补');
  } else {
    pass('@opencode2dsh/dsh-plugin 前端插槽注册正常');
  }
}

// 自动检测并自愈 dshmarket 缺少 options.id 缺陷
const dshmarketClient = path.join(PROFILE_WEB_DIR, 'node_modules', 'dshmarket', 'client', 'client.js');
if (fs.existsSync(dshmarketClient)) {
  let dmCode = fs.readFileSync(dshmarketClient, 'utf8');
  if (dmCode.includes('name: "settings.plugin.item"') && !dmCode.includes('id: NS')) {
    heal('检测到 dshmarket 注册 settings.plugin.item 缺少 options.id，正在自愈修补...');
    dmCode = dmCode.replace(
      'name: "settings.plugin.item",\\n\\t\\t\\t\\t\\tkey: NS,',
      'name: "settings.plugin.item",\\n\\t\\t\\t\\t\\tid: NS,\\n\\t\\t\\t\\t\\tkey: NS,'
    ).replace(
      'name: "settings.plugin.item",\\r\\n\\t\\t\\t\\t\\tkey: NS,',
      'name: "settings.plugin.item",\\r\\n\\t\\t\\t\\t\\tid: NS,\\r\\n\\t\\t\\t\\t\\tkey: NS,'
    );
    fs.writeFileSync(dshmarketClient, dmCode, 'utf8');
    pass('dshmarket settings.plugin.item options.id 补丁已修补');
  } else {
    pass('dshmarket 前端插槽注册正常');
  }
}`;

if (code.includes(targetStr) && !code.includes('@opencode2dsh/dsh-plugin')) {
  code = code.replace(targetStr, addition);
  fs.writeFileSync(scriptPath, code, 'utf8');
  console.log('Successfully updated verify_dsh.mjs with slot id self-healing rules');
} else {
  console.log('Already updated or pattern not found');
}
