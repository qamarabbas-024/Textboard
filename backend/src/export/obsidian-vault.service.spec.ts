import { ObsidianVaultService } from './obsidian-vault.service';

describe('ObsidianVaultService', () => {
  let service: ObsidianVaultService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      dataset: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ds_obsidian_1',
          name: 'Executive Strategy Chat',
          sourceType: 'whatsapp',
        }),
      },
      timelineEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ev_1',
            datasetId: 'ds_obsidian_1',
            actor: 'Alice',
            timestamp: new Date('2026-08-20T10:00:00Z'),
            content: 'Reviewing budget projections for Q3.',
          },
          {
            id: 'ev_2',
            datasetId: 'ds_obsidian_1',
            actor: 'Bob',
            timestamp: new Date('2026-08-20T10:05:00Z'),
            content: 'Approved. Forwarding to finance.',
          },
        ]),
      },
    };

    service = new ObsidianVaultService(mockPrisma);
  });

  it('should generate an Obsidian ZIP archive with internal wiki-links', async () => {
    const result = await service.generateObsidianVaultZip('ds_obsidian_1');

    expect(result.filename).toContain('Executive_Strategy_Chat_Obsidian_Vault.zip');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(100);
  });
});
