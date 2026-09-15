import fs from 'node:fs';
import path from 'node:path';

const USERPROFILE = process.env.USERPROFILE || 'C:\\Users\\admin';
const scriptPath = path.join(USERPROFILE, '.codex', 'skills', 'dsh-extension-guard', 'scripts', 'verify_dsh.mjs');

let code = fs.readFileSync(scriptPath, 'utf8');

const targetLoop = `  if (fs.existsSync(attachLib)) {
    let attCode = fs.readFileSync(attachLib, 'utf8');
    if (!attCode.includes('isImageAdmissionError')) {
      heal(\`检测到 \${targetLabel} dsh-attachment 缺少 isImageAdmissionError 导出，正在补齐...\`);
      attCode = attCode.replace(
        'export { AttachmentError, AttachmentId, AttachmentStore, AttachmentStore as default };',
        'function isImageAdmissionError(error) {\\n\\treturn error instanceof AttachmentError || error?.name === "AttachmentError";\\n}\\nexport { AttachmentError, AttachmentId, AttachmentStore, AttachmentStore as default, isImageAdmissionError };'
      );
      fs.writeFileSync(attachLib, attCode, 'utf8');
      pass(\`\${targetLabel} dsh-attachment isImageAdmissionError 导出已补齐\`);
    } else {
      pass(\`\${targetLabel} dsh-attachment isImageAdmissionError 导出正常\`);
    }
  }`;

const replacementLoop = `  if (fs.existsSync(attachLib)) {
    let attCode = fs.readFileSync(attachLib, 'utf8');
    if (!attCode.includes('isImageAdmissionError')) {
      heal(\`检测到 \${targetLabel} dsh-attachment 缺少 isImageAdmissionError 导出，正在补齐...\`);
      attCode = attCode.replace(
        'export { AttachmentError, AttachmentId, AttachmentStore, AttachmentStore as default };',
        'function isImageAdmissionError(error) {\\n\\treturn error instanceof AttachmentError || error?.name === "AttachmentError";\\n}\\nexport { AttachmentError, AttachmentId, AttachmentStore, AttachmentStore as default, isImageAdmissionError };'
      );
      fs.writeFileSync(attachLib, attCode, 'utf8');
      pass(\`\${targetLabel} dsh-attachment isImageAdmissionError 导出已补齐\`);
    } else {
      pass(\`\${targetLabel} dsh-attachment isImageAdmissionError 导出正常\`);
    }
  }

  const settingsLib = path.join(baseDir, 'dsh-settings', 'lib', 'index.js');
  if (fs.existsSync(settingsLib)) {
    let setCode = fs.readFileSync(settingsLib, 'utf8');
    if (!setCode.includes('installSettingsSection')) {
      heal(\`检测到 \${targetLabel} dsh-settings 缺少 installSettingsSection / settingsNamespace 兼容导出，正在补齐...\`);
      setCode = setCode.replace(
        'export { SettingsConflictError, SettingsProvider, SettingsProvider as default, redactSecrets };',
        'function installSettingsSection(ctx, ns, schema, entry, hooks) {\\n\\tctx.inject(["settings"], (settingsCtx) => {\\n\\t\\tsettingsCtx.settings.installSection(ctx, ns, schema, entry, hooks);\\n\\t});\\n}\\nconst settingsNamespace = parseSettingsNamespace;\\nexport { SettingsConflictError, SettingsProvider, SettingsProvider as default, installSettingsSection, redactSecrets, settingsNamespace };'
      );
      fs.writeFileSync(settingsLib, setCode, 'utf8');
      pass(\`\${targetLabel} dsh-settings 兼容导出已补齐\`);
    } else {
      pass(\`\${targetLabel} dsh-settings 兼容导出正常\`);
    }
  }`;

if (code.includes(targetLoop) && !code.includes('settingsLib')) {
  code = code.replace(targetLoop, replacementLoop);
  fs.writeFileSync(scriptPath, code, 'utf8');
  console.log('Successfully added dsh-settings patch to verify_dsh.mjs');
} else {
  console.log('Pattern not found or already added');
}
