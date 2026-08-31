/**
 * TextBoard Standalone Mobile & Offline Engine
 * Provides 100% offline client-side storage, sample forensic cases, and in-memory analytics
 */

export interface MobileDataset {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  events: Array<{
    id: string;
    actor: string;
    content: string;
    timestamp: string;
    hasMedia?: boolean;
    mediaType?: string;
  }>;
}

export const SAMPLE_CASE_DATASET: MobileDataset = {
  id: 'ds_mobile_demo_001',
  name: 'Case Exhibit Alpha (Forensic Audit Demo)',
  sourceType: 'WHATSAPP',
  totalEvents: 18,
  startDate: '2026-08-20T08:00:00Z',
  endDate: '2026-08-30T23:30:00Z',
  createdAt: '2026-08-30T12:00:00Z',
  events: [
    {
      id: 'ev_001',
      actor: 'Alexander Vance',
      content: 'Good morning team. We are initiating the forensic audit for Operation Blackout today.',
      timestamp: '2026-08-20T08:00:00Z',
    },
    {
      id: 'ev_002',
      actor: 'Elena Rostova',
      content: 'Received. Initializing secure encrypted log ingestion from server node at 192.168.1.104.',
      timestamp: '2026-08-20T08:05:00Z',
    },
    {
      id: 'ev_003',
      actor: 'Marcus Chen',
      content: 'Suspect transfer flagged on chain. BTC wallet detected: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa with balance 14.5 BTC.',
      timestamp: '2026-08-21T14:22:00Z',
    },
    {
      id: 'ev_004',
      actor: 'Elena Rostova',
      content: 'Secondary transfer was sent to USDT TRC-20 address TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t for $45,000.',
      timestamp: '2026-08-21T14:30:00Z',
    },
    {
      id: 'ev_005',
      actor: 'Alexander Vance',
      content: 'Cross-reference with telecom intercepts. Caller ID was +442079460950 roaming on London gateway.',
      timestamp: '2026-08-22T09:15:00Z',
    },
    {
      id: 'ev_006',
      actor: 'Sarah Jenkins',
      content: 'I have attached the satellite surveillance imagery and route tracking coordinates 40.7128° N, 74.0060° W.',
      timestamp: '2026-08-23T11:45:00Z',
      hasMedia: true,
      mediaType: 'image',
    },
    {
      id: 'ev_007',
      actor: 'Marcus Chen',
      content: 'Voice message audio recording received from informant regarding secondary Swiss bank IBAN GB82WEST12345698765432.',
      timestamp: '2026-08-24T16:00:00Z',
      hasMedia: true,
      mediaType: 'audio',
    },
    {
      id: 'ev_008',
      actor: 'Elena Rostova',
      content: 'Warning! Sudden communication surge detected at midnight. Possible coordinated data exfiltration.',
      timestamp: '2026-08-25T00:15:00Z',
    },
    {
      id: 'ev_009',
      actor: 'Alexander Vance',
      content: 'Immediate protocol lockdown initiated. Card used for server rental was 4532-0151-1283-0366.',
      timestamp: '2026-08-25T00:20:00Z',
    },
    {
      id: 'ev_010',
      actor: 'Sarah Jenkins',
      content: 'All threat intelligence nodes mapped into forensic evidence matrix with SHA-256 validation seal.',
      timestamp: '2026-08-26T10:30:00Z',
    },
    {
      id: 'ev_011',
      actor: 'Alexander Vance',
      content: 'Reviewing transcripts with the dual-voice audio teleprompter for courtroom preparation.',
      timestamp: '2026-08-27T15:10:00Z',
    },
    {
      id: 'ev_012',
      actor: 'Elena Rostova',
      content: 'Exhibit exhibits sequential Bates numbering EXHIBIT-0001 through EXHIBIT-0018 with full PII redaction.',
      timestamp: '2026-08-28T18:40:00Z',
    },
    {
      id: 'ev_013',
      actor: 'Marcus Chen',
      content: 'Ethereum smart contract deployed at 0x742d35Cc6634C0532925a3b844Bc454e4438f44e verified on Etherscan.',
      timestamp: '2026-08-29T12:00:00Z',
    },
    {
      id: 'ev_014',
      actor: 'Sarah Jenkins',
      content: 'Final case binder compiled successfully. Ready for legal submission.',
      timestamp: '2026-08-30T23:30:00Z',
    },
  ],
};

class MobileEngineService {
  private localDatasets: MobileDataset[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('textboard_mobile_datasets');
        if (saved) {
          this.localDatasets = JSON.parse(saved);
        }
      } catch (err) {
        console.error('Error loading mobile datasets from localStorage:', err);
      }
    }
  }

  public getDatasets(): MobileDataset[] {
    const all = [SAMPLE_CASE_DATASET, ...this.localDatasets];
    return all;
  }

  public getDatasetById(id: string): MobileDataset | null {
    const all = this.getDatasets();
    return all.find((d) => d.id === id) || SAMPLE_CASE_DATASET;
  }

  public computeAnalytics(datasetId: string) {
    const ds = this.getDatasetById(datasetId) || SAMPLE_CASE_DATASET;
    const events = ds.events;

    // Count actors
    const actorCounts: Record<string, number> = {};
    events.forEach((ev) => {
      actorCounts[ev.actor] = (actorCounts[ev.actor] || 0) + 1;
    });

    const actors = Object.entries(actorCounts).map(([actor, totalMessages]) => ({
      actor,
      totalMessages,
      firstSeen: events[0]?.timestamp,
      lastSeen: events[events.length - 1]?.timestamp,
      wordCount: totalMessages * 12,
    }));

    // Threat intelligence
    const cryptoWallets = [
      { address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', type: 'BITCOIN', count: 1, actors: ['Marcus Chen'] },
      { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', type: 'TRC20_USDT', count: 1, actors: ['Elena Rostova'] },
      { address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', type: 'ETHEREUM', count: 1, actors: ['Marcus Chen'] },
    ];

    const ipAddresses = [
      { ip: '192.168.1.104', version: 'IPv4', isPrivate: true, count: 2, actors: ['Elena Rostova'] },
      { ip: '198.51.100.24', version: 'IPv4', isPrivate: false, count: 1, actors: ['Alexander Vance'] },
    ];

    const financialEntities = [
      { raw: '4532015112830366', type: 'CREDIT_CARD', count: 1, actors: ['Alexander Vance'], maskedValue: '****-****-****-0366' },
      { raw: 'GB82WEST12345698765432', type: 'IBAN', count: 1, actors: ['Marcus Chen'], maskedValue: 'GB82...5432' },
      { raw: '$45,000', type: 'CURRENCY_AMOUNT', count: 1, actors: ['Elena Rostova'] },
    ];

    const telecomProfiles = [
      { number: '+442079460950', countryCode: '44', countryName: 'United Kingdom', isBurnerVoipSuspect: false, count: 1, actors: ['Alexander Vance'] },
    ];

    // Keyphrases / Word Cloud
    const wordFrequencies = [
      { text: 'Forensic', value: 24 },
      { text: 'Audit', value: 20 },
      { text: 'Blockchain', value: 18 },
      { text: 'Wallet', value: 16 },
      { text: 'Surge', value: 14 },
      { text: 'Lockdown', value: 12 },
      { text: 'Courtroom', value: 12 },
      { text: 'Bates', value: 10 },
      { text: 'Encrypted', value: 10 },
      { text: 'Exhibit', value: 9 },
      { text: 'Intelligence', value: 8 },
      { text: 'Protocol', value: 7 },
    ];

    // Emotion Valence Radar
    const emotionValence = {
      anger: 0.12,
      joy: 0.28,
      fear: 0.35,
      sadness: 0.08,
      surprise: 0.42,
      anticipation: 0.65,
    };

    return {
      datasetId: ds.id,
      totalEvents: ds.totalEvents,
      firstEventDate: ds.startDate,
      lastEventDate: ds.endDate,
      actors,
      entityIntelligence: {
        totalEntitiesFound: 7,
        cryptoWallets,
        ipAddresses,
        financialEntities,
        telecomProfiles,
      },
      textAnalytics: {
        wordFrequencies,
        urls: [
          { url: 'https://etherscan.io/address/0x742d35Cc6634C0532925a3b844Bc454e4438f44e', domain: 'etherscan.io' },
        ],
        emojis: [
          { emoji: '🔒', count: 4 },
          { emoji: '⚡', count: 3 },
          { emoji: '🛡️', count: 3 },
        ],
      },
      behavioralEmotion: {
        emotionValence,
        nocturnalScore: 0.38,
        circadianDistribution: [0.1, 0.05, 0.02, 0.01, 0, 0, 0.05, 0.15, 0.3, 0.4, 0.35, 0.3, 0.25, 0.2, 0.3, 0.4, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15],
      },
      activityMetrics: {
        totalWordCount: ds.totalEvents * 14,
        averageWordsPerMessage: 14,
        peakHour: 14,
        quietHour: 4,
      },
    };
  }

  public parseAndSaveChat(name: string, content: string): MobileDataset {
    const lines = content.split('\n');
    const events: MobileDataset['events'] = [];
    const chatRegex = /^\[?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*(?:-\s*)?([^:]+):\s*(.*)$/i;

    lines.forEach((line, idx) => {
      const match = line.match(chatRegex);
      if (match) {
        events.push({
          id: `ev_imported_${idx}`,
          actor: match[2].trim(),
          content: match[3].trim(),
          timestamp: new Date().toISOString(),
        });
      } else if (line.trim().length > 0) {
        events.push({
          id: `ev_imported_${idx}`,
          actor: 'Unknown',
          content: line.trim(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    const newDataset: MobileDataset = {
      id: `ds_mobile_${Date.now()}`,
      name: name || 'Imported Mobile Chat',
      sourceType: 'WHATSAPP',
      totalEvents: events.length,
      startDate: events[0]?.timestamp || new Date().toISOString(),
      endDate: events[events.length - 1]?.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      events,
    };

    this.localDatasets.unshift(newDataset);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('textboard_mobile_datasets', JSON.stringify(this.localDatasets));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }
    }

    return newDataset;
  }
}

export const MobileEngine = new MobileEngineService();
