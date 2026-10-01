import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';

export interface WindowsToastOptions {
  /** 通知标题 */
  title: string;
  /** 通知正文内容 */
  message: string;
  /** 点击整个通知卡片时拉起的 URL 协议或链接 */
  launchUrl?: string;
  /** 提示音类型 (默认 'default') */
  audio?: 'default' | 'im' | 'reminder' | 'sms' | 'alarm' | 'silent';
  /** 通知场景模式 (默认 'default') */
  scenario?: 'default' | 'reminder' | 'alarm';
  /** 附属动作按钮列表 */
  actions?: Array<{
    title: string;
    launchUrl: string;
  }>;
}

export class WindowsToastService {
  private static readonly DEFAULT_AUMID = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe';

  private static readonly AUDIO_MAP: Record<string, string> = {
    default: 'ms-winsoundevent:Notification.Default',
    im: 'ms-winsoundevent:Notification.IM',
    reminder: 'ms-winsoundevent:Notification.Reminder',
    sms: 'ms-winsoundevent:Notification.SMS',
    alarm: 'ms-winsoundevent:Notification.Looping.Alarm',
  };

  private static escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  private static encodePowerShellCommand(script: string): string {
    return Buffer.from(script, 'utf16le').toString('base64');
  }

  private static buildToastXml(options: WindowsToastOptions): string {
    const escapedTitle = this.escapeXml(options.title);
    const escapedMessage = this.escapeXml(options.message);
    const scenarioAttr = options.scenario && options.scenario !== 'default' ? `scenario="${options.scenario}"` : '';
    const launchAttr = options.launchUrl ? `activationType="protocol" launch="${this.escapeXml(options.launchUrl)}"` : '';

    let audioXml = '<audio silent="true" />';
    if (options.audio && options.audio !== 'silent') {
      const audioUri = this.AUDIO_MAP[options.audio] || this.AUDIO_MAP.default;
      audioXml = `<audio src="${audioUri}" silent="false" />`;
    } else if (!options.audio) {
      audioXml = `<audio src="${this.AUDIO_MAP.default}" silent="false" />`;
    }

    let actionsXml = '';
    if (options.actions && options.actions.length > 0) {
      const actionElements = options.actions.slice(0, 3).map((act) => {
        return `<action content="${this.escapeXml(act.title)}" activationType="protocol" arguments="${this.escapeXml(act.launchUrl)}" />`;
      }).join('\n      ');
      actionsXml = `<actions>\n      ${actionElements}\n    </actions>`;
    }

    return `
<toast ${scenarioAttr} ${launchAttr}>
  <visual>
    <binding template="ToastGeneric">
      <text><![CDATA[${escapedTitle}]]></text>
      <text><![CDATA[${escapedMessage}]]></text>
      <text placement="attribution"><![CDATA[DSH Web Enhancements]]></text>
    </binding>
  </visual>
  ${audioXml}
  ${actionsXml}
</toast>
`.trim();
  }

  public static showToast(options: WindowsToastOptions): void {
    if (process.platform !== 'win32') return;

    try {
      const toastXml = this.buildToastXml(options);
      const appId = this.DEFAULT_AUMID;

      const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$xml = @"
${toastXml}
"@

$xmlDoc = [Windows.Data.Xml.Dom.XmlDocument]::new()
$xmlDoc.LoadXml($xml)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xmlDoc)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("${appId}")
$notifier.Show($toast)
`;

      const encodedCmd = this.encodePowerShellCommand(psScript);

      const child = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle', 'Hidden',
          '-EncodedCommand', encodedCmd,
        ],
        {
          stdio: 'ignore',
          windowsHide: true,
          detached: true,
        },
      );

      child.on('error', () => {});
      child.unref();
    } catch {
      // 容错降级
    }
  }
}
