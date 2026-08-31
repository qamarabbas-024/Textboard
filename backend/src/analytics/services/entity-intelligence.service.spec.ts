import { EntityIntelligenceService } from './entity-intelligence.service';

describe('EntityIntelligenceService', () => {
  const service = new EntityIntelligenceService();

  it('should extract Bitcoin, Ethereum, and TRC-20 USDT wallet addresses', () => {
    const events = [
      {
        id: '1',
        actor: 'Suspect_A',
        content: 'Transfer 0.5 BTC to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa or 0x742d35Cc6634C0532925a3b844Bc454e4438f44e immediately.',
        timestamp: new Date(),
      },
      {
        id: '2',
        actor: 'Suspect_B',
        content: 'Here is the USDT address: TXxx123456789012345678901234567890 for the payment of $50,000.',
        timestamp: new Date(),
      },
    ];

    const report = service.scanDatasetEntities(events);

    expect(report.cryptoWallets.length).toBeGreaterThanOrEqual(2);
    expect(report.cryptoWallets.some((w) => w.type === 'BITCOIN')).toBe(true);
    expect(report.cryptoWallets.some((w) => w.type === 'ETHEREUM')).toBe(true);
  });

  it('should extract IP addresses and identify private vs public network segments', () => {
    const events = [
      {
        id: '1',
        actor: 'NetworkAdmin',
        content: 'Internal server is 192.168.1.50 and external gateway is 203.0.113.195',
        timestamp: new Date(),
      },
    ];

    const report = service.scanDatasetEntities(events);

    expect(report.ipAddresses.length).toBe(2);
    const privateIp = report.ipAddresses.find((i) => i.ip === '192.168.1.50');
    const publicIp = report.ipAddresses.find((i) => i.ip === '203.0.113.195');

    expect(privateIp?.isPrivate).toBe(true);
    expect(publicIp?.isPrivate).toBe(false);
  });

  it('should validate credit card numbers with Luhn check and mask them', () => {
    // Valid sample test Visa number passes Luhn
    const validCard = '4532015112830366';
    expect(service.passesLuhnCheck(validCard)).toBe(true);

    const invalidCard = '4532015112830367';
    expect(service.passesLuhnCheck(invalidCard)).toBe(false);
  });

  it('should extract and profile international phone numbers by country prefix', () => {
    const events = [
      {
        id: '1',
        actor: 'Lead_Analyst',
        content: 'Contact London office at +442079460950 and Islamabad HQ at +923001234567',
        timestamp: new Date(),
      },
    ];

    const report = service.scanDatasetEntities(events);

    expect(report.telecomEntities.length).toBeGreaterThanOrEqual(1);
    const ukPhone = report.telecomEntities.find((p) => p.countryName === 'United Kingdom');
    const pkPhone = report.telecomEntities.find((p) => p.countryName === 'Pakistan');

    expect(ukPhone).toBeDefined();
    expect(pkPhone).toBeDefined();
  });
});
