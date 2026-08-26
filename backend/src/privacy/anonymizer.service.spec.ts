import { AnonymizerService } from './anonymizer.service';

describe('AnonymizerService', () => {
  let service: AnonymizerService;

  beforeEach(() => {
    service = new AnonymizerService();
  });

  it('should redact emails, phone numbers, and IP addresses', () => {
    const raw = 'Contact john.doe@example.com or call +1 (555) 123-4567. Server is at 192.168.1.100.';
    const result = service.anonymize(raw, 'Alice');

    expect(result.text).toContain('[EMAIL-REDACTED]');
    expect(result.text).toContain('[PHONE-REDACTED]');
    expect(result.text).toContain('[IP-REDACTED]');
    expect(result.actor).toBe('Participant 1');
    expect(result.redactionCount).toBe(3);
  });

  it('should maintain consistent actor pseudonymization across multiple calls', () => {
    const res1 = service.anonymize('First message', 'Bob');
    const res2 = service.anonymize('Second message', 'Bob');
    const res3 = service.anonymize('Third message', 'Charlie');

    expect(res1.actor).toBe('Participant 1');
    expect(res2.actor).toBe('Participant 1');
    expect(res3.actor).toBe('Participant 2');
  });

  it('should respect custom actor mappings', () => {
    const result = service.anonymize('Confidential update', 'Alice', {
      actorMapping: { Alice: 'Agent Alpha' },
    });

    expect(result.actor).toBe('Agent Alpha');
  });
});
