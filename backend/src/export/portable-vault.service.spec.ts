import { PortableVaultService } from './portable-vault.service';

describe('PortableVaultService', () => {
  let service: PortableVaultService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      dataset: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ds_vault_1',
          name: 'Confidential Audit',
          sourceType: 'whatsapp',
          metadata: '{}',
        }),
        create: jest.fn().mockResolvedValue({
          id: 'ds_imported_99',
          name: 'Confidential Audit [Imported]',
          sourceType: 'whatsapp',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      timelineEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ev_1',
            datasetId: 'ds_vault_1',
            actor: 'Alice',
            timestamp: new Date('2026-08-20T10:00:00Z'),
            content: 'Transfer receipt attached.',
            eventType: 'message',
            charLength: 26,
            wordCount: 3,
            hasUrls: false,
            hasEmojis: false,
            hasMedia: false,
          },
        ]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new PortableVaultService(mockPrisma);
  });

  it('should export a valid .textboard bundle with SHA-256 checksum', async () => {
    const result = await service.exportPortableBundle('ds_vault_1');

    expect(result.filename).toBe('Confidential_Audit.textboard');
    expect(result.buffer).toBeInstanceOf(Buffer);

    const parsed = JSON.parse(result.buffer.toString('utf-8'));
    expect(parsed.formatVersion).toBe('textboard/v1');
    expect(parsed.checksum).toBeDefined();
    expect(parsed.events.length).toBe(1);
  });

  it('should import a .textboard bundle and create new dataset with events', async () => {
    const bundlePayload = JSON.stringify({
      formatVersion: 'textboard/v1',
      exportedAt: new Date().toISOString(),
      checksum: 'sha256_mock',
      dataset: { name: 'Restored Case', sourceType: 'telegram' },
      events: [
        {
          actor: 'Bob',
          timestamp: new Date().toISOString(),
          content: 'Restored transmission',
          eventType: 'message',
        },
      ],
    });

    const result = await service.importPortableBundle(bundlePayload);
    expect(result.datasetId).toBe('ds_imported_99');
    expect(result.totalEvents).toBe(1);
    expect(mockPrisma.timelineEvent.createMany).toHaveBeenCalled();
  });
});
