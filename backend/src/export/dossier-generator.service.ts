import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsEngineService } from '../analytics/analytics-engine.service';
import * as crypto from 'crypto';

@Injectable()
export class DossierGeneratorService {
  private readonly logger = new Logger(DossierGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsEngine: AnalyticsEngineService,
  ) {}

  /**
   * Generates a complete, zero-dependency standalone HTML Forensic Case Dossier.
   */
  async generateHtmlDossier(datasetId: string): Promise<{ filename: string; html: string; checksum: string }> {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
    });
    if (!dataset) {
      throw new NotFoundException(`Dataset ${datasetId} not found`);
    }

    const analytics = await this.analyticsEngine.getDatasetAnalytics(datasetId);
    const anomalies = await this.analyticsEngine.getAnomalies(datasetId);

    // Fetch sample recent events for the interactive viewer
    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      select: {
        id: true,
        actor: true,
        timestamp: true,
        content: true,
        charLength: true,
        wordCount: true,
      },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const generatedAt = new Date().toISOString();
    const sha256 = crypto
      .createHash('sha256')
      .update(`${dataset.id}_${dataset.totalEvents}_${generatedAt}`)
      .digest('hex');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forensic Case Dossier — ${this.escapeHtml(dataset.name)}</title>
  <style>
    :root {
      --bg: #090c10;
      --surface: #121824;
      --card: #182232;
      --border: #233348;
      --accent: #22d3ee;
      --accent-dim: rgba(34, 211, 238, 0.15);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --dim: #64748b;
      --critical: #f43f5e;
      --warning: #f59e0b;
      --success: #10b981;
    }
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .no-print { display: none !important; }
      .card { border: 1px solid #ccc !important; background: #fff !important; color: #000 !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, monospace;
      line-height: 1.5;
      padding: 2rem 1rem;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    .header {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-accent { background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent); }
    .badge-crit { background: rgba(244,63,94,0.15); color: var(--critical); border: 1px solid var(--critical); }
    .badge-warn { background: rgba(245,158,11,0.15); color: var(--warning); border: 1px solid var(--warning); }
    .grid { display: grid; gap: 1rem; }
    .grid-2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    .grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
    }
    .stat-val { font-size: 1.75rem; font-weight: 800; color: var(--accent); font-family: monospace; }
    .stat-label { font-size: 0.75rem; color: var(--dim); text-transform: uppercase; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 0.75rem; text-transform: uppercase; }
    td { padding: 0.6rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .search-bar {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      outline: none;
    }
    .search-bar:focus { border-color: var(--accent); }
    .msg-item {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
    }
    .meta-tag { font-size: 0.7rem; color: var(--dim); font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge badge-accent">TextBoard Forensic Dossier</span>
          <h1 style="font-size: 1.5rem; font-weight: 800; margin-top: 0.5rem;">${this.escapeHtml(dataset.name)}</h1>
          <p style="color: var(--muted); font-size: 0.85rem; margin-top: 0.25rem;">
            Source: ${dataset.sourceType.toUpperCase()} | Generated: ${generatedAt}
          </p>
        </div>
        <div style="text-align: right; font-family: monospace; font-size: 0.75rem; color: var(--dim);">
          <div>SHA-256 AUDIT DIGEST</div>
          <div style="color: var(--accent); word-break: break-all; max-width: 320px;">${sha256}</div>
        </div>
      </div>
    </header>

    <!-- Top KPI Grid -->
    <section class="grid grid-4" style="margin-bottom: 1.5rem;">
      <div class="card">
        <div class="stat-label">Total Messages</div>
        <div class="stat-val">${analytics.messageAnalytics.totalMessages.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="stat-label">Total Words</div>
        <div class="stat-val">${analytics.messageAnalytics.totalWords.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="stat-label">Active Days</div>
        <div class="stat-val">${analytics.activityAnalytics.totalActiveDays}</div>
      </div>
      <div class="card">
        <div class="stat-label">Critical Anomalies</div>
        <div class="stat-val" style="color: var(--critical);">${anomalies.criticalCount}</div>
      </div>
    </section>

    <!-- Activity Waveform SVG Chart -->
    <section class="card" style="margin-bottom: 1.5rem;">
      <h2 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem; color: var(--text);">
        📈 Diurnal Circadian Velocity Profile
      </h2>
      <div style="background: var(--card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border);">
        <svg viewBox="0 0 720 120" style="width: 100%; height: auto;">
          ${analytics.messageAnalytics.byHour.map((h, i) => {
            const maxVal = Math.max(...analytics.messageAnalytics.byHour.map(x => x.count), 1);
            const x = 30 + (i / 23) * 660;
            const barH = (h.count / maxVal) * 80;
            const y = 95 - barH;
            return `<rect x="${x - 8}" y="${y}" width="16" height="${barH}" rx="3" fill="#22d3ee" opacity="0.8" />
                    <text x="${x}" y="112" text-anchor="middle" fill="#64748b" font-size="8" font-family="monospace">${h.hour}:00</text>`;
          }).join('')}
        </svg>
      </div>
    </section>

    <!-- Forensic Anomalies Section -->
    <section class="card" style="margin-bottom: 1.5rem;">
      <h2 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem; color: var(--text);">
        🚨 Forensic Communication Anomalies (${anomalies.totalAnomalies})
      </h2>
      ${
        anomalies.anomalies.length === 0
          ? '<p style="color: var(--dim); font-size: 0.85rem;">No statistical anomalies detected in this stream.</p>'
          : `<div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${anomalies.anomalies
                .slice(0, 10)
                .map(
                  (a) => `
                <div style="background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 0.85rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                    <span class="badge ${a.severity === 'CRITICAL' ? 'badge-crit' : a.severity === 'WARNING' ? 'badge-warn' : 'badge-accent'}">
                      ${a.severity} • ${a.type.replace(/_/g, ' ')}
                    </span>
                    <span style="font-size: 0.75rem; color: var(--dim);">${new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: var(--text); margin-top: 0.35rem;">${this.escapeHtml(a.title)}</div>
                  <div style="font-size: 0.8rem; color: var(--muted); margin-top: 0.2rem;">${this.escapeHtml(a.description)}</div>
                  ${a.sampleSnippet ? `<div style="font-size: 0.75rem; color: var(--dim); font-style: italic; margin-top: 0.4rem; padding: 0.4rem; background: rgba(0,0,0,0.3); border-radius: 4px;">&quot;${this.escapeHtml(a.sampleSnippet)}&quot;</div>` : ''}
                </div>
              `,
                )
                .join('')}
            </div>`
      }
    </section>

    <!-- Participant Distribution -->
    <section class="card" style="margin-bottom: 1.5rem;">
      <h2 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem; color: var(--text);">
        👥 Participant Engagement Breakdown
      </h2>
      <table>
        <thead>
          <tr>
            <th>Participant</th>
            <th>Messages</th>
            <th>Volume Share</th>
            <th>Total Words</th>
            <th>Avg Length</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.messageAnalytics.byPerson
            .map(
              (p) => `
            <tr>
              <td style="font-weight: 600; color: var(--text);">${this.escapeHtml(p.actor)}</td>
              <td style="color: var(--accent); font-family: monospace;">${p.messageCount.toLocaleString()}</td>
              <td>${p.percentage}%</td>
              <td>${p.totalWords.toLocaleString()}</td>
              <td>${p.avgChars} chars</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </section>

    <!-- Interactive Event Explorer -->
    <section class="card">
      <h2 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem; color: var(--text);">
        💬 Interactive Timeline Sample Viewer (Recent 200 Entries)
      </h2>
      <input
        type="text"
        id="searchInput"
        class="search-bar no-print"
        placeholder="Type keyword or sender name to filter events in real-time..."
        onkeyup="filterMessages()"
      />
      <div id="messagesList">
        ${events
          .map(
            (ev) => `
          <div class="msg-item" data-search="${this.escapeHtml((ev.actor || '') + ' ' + ev.content).toLowerCase()}">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.25rem;">
              <strong style="color: var(--accent);">${this.escapeHtml(ev.actor || 'System')}</strong>
              <span class="meta-tag">${new Date(ev.timestamp).toLocaleString()}</span>
            </div>
            <div style="font-size: 0.85rem; color: var(--text);">${this.escapeHtml(ev.content)}</div>
          </div>
        `,
          )
          .join('')}
      </div>
    </section>
  </div>

  <script>
    function filterMessages() {
      const q = document.getElementById('searchInput').value.toLowerCase();
      const items = document.querySelectorAll('.msg-item');
      items.forEach(item => {
        const text = item.getAttribute('data-search') || '';
        item.style.display = text.includes(q) ? 'block' : 'none';
      });
    }
  </script>
</body>
</html>`;

    const filename = `${dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Forensic_Dossier.html`;
    return {
      filename,
      html,
      checksum: sha256,
    };
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
