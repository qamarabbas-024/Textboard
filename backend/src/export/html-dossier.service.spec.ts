import { HtmlDossierService, DossierInput } from './html-dossier.service';

describe('HtmlDossierService', () => {
  const service = new HtmlDossierService();

  it('should generate self-contained HTML forensic dossier with SHA-256 integrity seal', () => {
    const input: DossierInput = {
      datasetName: 'Operation Cipher WhatsApp Backup',
      sourceType: 'WHATSAPP',
      totalEvents: 3,
      startDate: '2026-08-01T00:00:00Z',
      endDate: '2026-08-10T00:00:00Z',
      actors: ['Agent Smith', 'Target Alpha'],
      topTopics: ['security', 'rendezvous'],
      keyAnomalies: [
        {
          type: 'VELOCITY_SPIKE',
          severity: 'CRITICAL',
          description: 'Sudden spike of 45 messages in 10 minutes',
          timestamp: '2026-08-05T12:00:00Z',
        },
      ],
      messages: [
        {
          id: 'msg_1',
          timestamp: '2026-08-01T10:00:00Z',
          actor: 'Agent Smith',
          content: 'Initial contact established.',
        },
        {
          id: 'msg_2',
          timestamp: '2026-08-02T11:00:00Z',
          actor: 'Target Alpha',
          content: 'Coordinates received: 34.0522, -118.2437',
        },
      ],
    };

    const html = service.generateStandaloneHtml(input);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Operation Cipher WhatsApp Backup');
    expect(html).toContain('Agent Smith');
    expect(html).toContain('Target Alpha');
    expect(html).toContain('SHA-256:');
    expect(html).toContain('allMessages');
    expect(html).toContain('Interactive Offline Message Browser');
  });
});
