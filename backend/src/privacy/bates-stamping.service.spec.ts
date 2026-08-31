import { BatesStampingService } from './bates-stamping.service';

describe('BatesStampingService', () => {
  const service = new BatesStampingService();

  it('1. should generate sequential padded Bates numbers across events', () => {
    const events = [
      { id: '1', actor: 'Alice', content: 'First message', timestamp: new Date() },
      { id: '2', actor: 'Bob', content: 'Second message', timestamp: new Date() },
      { id: '3', actor: 'Alice', content: 'Third message', timestamp: new Date() },
    ];

    const result = service.applyBatesStamping(events, {
      prefix: 'SEC-CASE',
      startNumber: 1,
      digits: 4,
      suffix: 'CONFIDENTIAL',
    });

    expect(result.totalStamped).toBe(3);
    expect(result.firstBatesNumber).toBe('SEC-CASE-0001-CONFIDENTIAL');
    expect(result.lastBatesNumber).toBe('SEC-CASE-0003-CONFIDENTIAL');
    expect(result.events[1].batesNumber).toBe('SEC-CASE-0002-CONFIDENTIAL');
  });

  it('2. should redact credit cards, phone numbers, and crypto addresses when enabled', () => {
    const events = [
      {
        id: '1',
        actor: 'Suspect',
        content: 'Card is 4532-0151-1283-0366, call me at +442079460950 or send BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        timestamp: new Date(),
      },
    ];

    const result = service.applyBatesStamping(events, {
      prefix: 'EXHIBIT',
      startNumber: 100,
      digits: 5,
      enableRedaction: true,
      redactCreditCards: true,
      redactPhoneNumbers: true,
      redactCryptoWallets: true,
    });

    expect(result.totalRedactions).toBe(3);
    const content = result.events[0].content;
    expect(content).toContain('[REDACTED: FINANCIAL CARD]');
    expect(content).toContain('[REDACTED: PHONE NUMBER]');
    expect(content).toContain('[REDACTED: CRYPTO WALLET]');
    expect(content).not.toContain('4532-0151-1283-0366');
    expect(content).not.toContain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  });

  it('3. should redact custom sensitive keywords', () => {
    const events = [
      {
        id: '1',
        actor: 'Whistleblower',
        content: 'Project Manhattan blueprint is inside Operation Blackout file.',
        timestamp: new Date(),
      },
    ];

    const result = service.applyBatesStamping(events, {
      prefix: 'EVID',
      startNumber: 1,
      digits: 4,
      enableRedaction: true,
      customKeywords: ['Manhattan', 'Blackout'],
    });

    expect(result.totalRedactions).toBe(2);
    expect(result.events[0].content).toContain('[REDACTED: SENSITIVE]');
    expect(result.events[0].content).not.toContain('Manhattan');
  });
});
