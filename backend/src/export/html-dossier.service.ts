import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DossierInput {
  datasetName: string;
  sourceType: string;
  totalEvents: number;
  startDate?: string;
  endDate?: string;
  actors: string[];
  topTopics: string[];
  keyAnomalies: Array<{ type: string; severity: string; description: string; timestamp: string }>;
  messages: Array<{ id: string; timestamp: string; actor: string; content: string }>;
}

@Injectable()
export class HtmlDossierService {
  private readonly logger = new Logger(HtmlDossierService.name);

  /**
   * Generates a completely standalone, self-contained HTML forensic dossier with embedded search
   */
  generateStandaloneHtml(input: DossierInput): string {
    const serializedData = JSON.stringify(input.messages || []).replace(/</g, '\\u003c');
    const sha256Checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Forensic Dossier — ${this.escapeHtml(input.datasetName)}</title>
  <style>
    :root {
      --bg: #04060c;
      --card: #0a0f1d;
      --border: rgba(0, 240, 255, 0.2);
      --accent: #00f0ff;
      --text: #f8fafc;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 32px 16px;
      line-height: 1.5;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(0, 240, 255, 0.15);
      border: 1px solid var(--accent);
      color: var(--accent);
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    h1 { font-size: 20px; font-weight: 900; margin-bottom: 6px; color: #fff; }
    .meta { font-size: 11px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card {
      background: var(--card);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px;
    }
    .card-title { font-size: 10px; text-transform: uppercase; color: var(--muted); font-weight: bold; }
    .card-val { font-size: 20px; font-weight: bold; color: var(--accent); margin-top: 4px; }
    .search-box {
      width: 100%;
      background: #020408;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      color: #fff;
      font-family: inherit;
      font-size: 12px;
      outline: none;
      margin-bottom: 16px;
    }
    .search-box:focus { border-color: var(--accent); }
    .msg-list { display: flex; flex-direction: column; gap: 8px; max-height: 600px; overflow-y: auto; }
    .msg-item {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 11px;
    }
    .msg-actor { color: var(--accent); font-weight: bold; margin-right: 8px; }
    .msg-time { color: var(--muted); font-size: 10px; }
    .msg-content { margin-top: 4px; color: #e2e8f0; white-space: pre-wrap; }
    .seal {
      margin-top: 32px;
      padding: 16px;
      border: 1px dashed rgba(255,255,255,0.15);
      border-radius: 12px;
      text-align: center;
      font-size: 10px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">AIRGAPPED STANDALONE FORENSIC DOSSIER</div>
      <h1>${this.escapeHtml(input.datasetName)}</h1>
      <p class="meta">Exported from TextBoard Workstation • Source: ${this.escapeHtml(input.sourceType)} • ${input.totalEvents.toLocaleString()} Total Records</p>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Records</div>
        <div class="card-val">${input.totalEvents.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-title">Key Participants</div>
        <div class="card-val">${input.actors?.length || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Anomalies Logged</div>
        <div class="card-val" style="color:#f43f5e;">${input.keyAnomalies?.length || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Investigation Span</div>
        <div class="card-val" style="font-size:12px; color:#fff; margin-top:8px;">${input.startDate ? new Date(input.startDate).toLocaleDateString() : 'N/A'} → ${input.endDate ? new Date(input.endDate).toLocaleDateString() : 'N/A'}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title" style="margin-bottom: 12px;">Interactive Offline Message Browser</div>
      <input type="text" id="searchInput" class="search-box" placeholder="Type to search messages in real-time..." />
      <div id="resultsInfo" style="font-size: 10px; color: var(--muted); margin-bottom: 8px;"></div>
      <div id="messageList" class="msg-list"></div>
    </div>

    <div class="seal">
      <div>🔒 <strong>CRYPTOGRAPHIC INTEGRITY SEAL</strong></div>
      <div style="font-family: monospace; word-break: break-all; margin-top: 4px; color: var(--accent);">SHA-256: ${sha256Checksum}</div>
      <div style="margin-top: 4px;">Zero cloud reliance. 100% self-contained client-side forensic document.</div>
    </div>
  </div>

  <script>
    const allMessages = ${serializedData};
    const searchInput = document.getElementById('searchInput');
    const messageList = document.getElementById('messageList');
    const resultsInfo = document.getElementById('resultsInfo');

    function renderMessages(items) {
      resultsInfo.textContent = 'Showing ' + items.length.toLocaleString() + ' of ' + allMessages.length.toLocaleString() + ' records';
      if (!items.length) {
        messageList.innerHTML = '<div style="padding: 24px; text-align: center; color: #64748b; font-size: 11px;">No records matched your search query.</div>';
        return;
      }
      const html = items.slice(0, 200).map(m => {
        return '<div class="msg-item">' +
          '<div><span class="msg-actor">' + escapeHtml(m.actor || 'System') + '</span>' +
          '<span class="msg-time">' + escapeHtml(new Date(m.timestamp).toLocaleString()) + '</span></div>' +
          '<div class="msg-content">' + escapeHtml(m.content || '') + '</div>' +
        '</div>';
      }).join('');
      messageList.innerHTML = html;
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        renderMessages(allMessages);
        return;
      }
      const filtered = allMessages.filter(m => {
        return (m.actor && m.actor.toLowerCase().includes(q)) ||
               (m.content && m.content.toLowerCase().includes(q));
      });
      renderMessages(filtered);
    });

    renderMessages(allMessages);
  </script>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
