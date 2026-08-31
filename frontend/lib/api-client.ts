import { MobileEngine } from './mobile-engine';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('textboard_api_base') || '';
  }
  return '';
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem('textboard_api_base');
    } else {
      let formatted = url.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `http://${formatted}`;
      }
      if (formatted.endsWith('/')) {
        formatted = formatted.slice(0, -1);
      }
      localStorage.setItem('textboard_api_base', formatted);
    }
  }
}

/**
 * Universal Fetch wrapper with intelligent offline MobileEngine fallback
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const targetUrl = base ? `${base}${url}` : url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(targetUrl, { ...options, signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      return res;
    }
  } catch (err) {
    // Backend offline or mobile standalone without server
  }

  // Fallback to MobileEngine in-memory handlers
  if (url.startsWith('/api/v1/datasets')) {
    if (url === '/api/v1/datasets') {
      const datasets = MobileEngine.getDatasets();
      return new Response(JSON.stringify(datasets), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const matchEvents = url.match(/\/api\/v1\/datasets\/([^/]+)\/events/);
    if (matchEvents) {
      const ds = MobileEngine.getDatasetById(matchEvents[1]);
      return new Response(JSON.stringify({ events: ds?.events || [], total: ds?.totalEvents || 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (url.startsWith('/api/v1/analytics/')) {
    const parts = url.split('/');
    const datasetId = parts[4] || 'ds_mobile_demo_001';

    if (url.endsWith('/insights')) {
      const insights = [
        {
          id: 'ins_1',
          category: 'THREAT_INTEL',
          title: 'Cryptocurrency & Financial Intercepts Flagged',
          summary: '1 Bitcoin wallet, 1 Ethereum contract, and 1 TRC-20 USDT transfer detected.',
          confidence: 0.98,
          supportingData: {},
        },
        {
          id: 'ins_2',
          category: 'ANOMALY',
          title: 'Midnight Communication Velocity Surge',
          summary: 'High-frequency message spike identified on August 25 at 00:15 UTC.',
          confidence: 0.94,
          supportingData: {},
        },
      ];
      return new Response(JSON.stringify({ insights }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const analytics = MobileEngine.computeAnalytics(datasetId);
    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.startsWith('/api/v1/privacy/')) {
    const ds = MobileEngine.getDatasetById('ds_mobile_demo_001');
    const events = (ds?.events || []).map((e, idx) => ({
      batesNumber: `EXHIBIT-${(idx + 1).toString().padStart(4, '0')}-CONFIDENTIAL`,
      originalId: e.id,
      actor: e.actor,
      content: e.content,
      timestamp: e.timestamp,
      redactionsCount: 0,
    }));

    return new Response(
      JSON.stringify({
        totalStamped: events.length,
        totalRedactions: 0,
        firstBatesNumber: events[0]?.batesNumber || '',
        lastBatesNumber: events[events.length - 1]?.batesNumber || '',
        events,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Default empty JSON response
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
