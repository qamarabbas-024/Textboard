import { OnlineGatewayService } from './online-gateway.service';
import { OsintEnricherService } from './osint-enricher.service';
import { CloudLlmService } from './cloud-llm.service';

describe('Online Mode Gateway & OSINT Enricher Suite', () => {
  let gateway: OnlineGatewayService;
  let osint: OsintEnricherService;
  let cloudLlm: CloudLlmService;

  beforeEach(() => {
    gateway = new OnlineGatewayService();
    osint = new OsintEnricherService(gateway);
    cloudLlm = new CloudLlmService(gateway);
  });

  it('1. should block all online operations by default when Airgap Mode is active', async () => {
    expect(gateway.isOnline()).toBe(false);

    await expect(osint.checkIpReputation('203.0.113.195')).rejects.toThrow(
      /Airgap Security Policy Violation/i,
    );

    await expect(osint.checkUrlReputation('https://malicious-site.com')).rejects.toThrow(
      /Airgap Security Policy Violation/i,
    );

    await expect(
      cloudLlm.queryCloudLlm({
        provider: 'gemini',
        prompt: 'Synthesize case timeline',
        contextMessages: [],
      }),
    ).rejects.toThrow(/Airgap Security Policy Violation/i);
  });

  it('2. should permit OSINT and Cloud queries once Online Mode is explicitly enabled', async () => {
    gateway.updateSettings({ isOnlineModeEnabled: true });
    expect(gateway.isOnline()).toBe(true);

    const ipResult = await osint.checkIpReputation('203.0.113.195');
    expect(ipResult.ip).toBe('203.0.113.195');
    expect(ipResult.abuseConfidenceScore).toBeDefined();

    const urlResult = await osint.checkUrlReputation('https://safe-portal.com');
    expect(urlResult.url).toBe('https://safe-portal.com');
    expect(urlResult.harmlessCount).toBeGreaterThan(0);

    const btcResult = await osint.checkCryptoBalance('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'BITCOIN');
    expect(btcResult.chain).toBe('BITCOIN');
    expect(btcResult.balanceFormatted).toBeDefined();

    const llmResult = await cloudLlm.queryCloudLlm({
      provider: 'gemini',
      prompt: 'Who initiated contact?',
      contextMessages: [
        {
          actor: 'Alice',
          timestamp: '2026-08-30T10:00:00Z',
          content: 'Hello Bob, let us review the report.',
        },
      ],
    });

    expect(llmResult.answer).toBeDefined();
    expect(llmResult.citations.length).toBe(1);
  });

  it('3. should mask API keys when returning public settings', () => {
    gateway.updateSettings({
      geminiApiKey: 'AIzaSySecretApiKey12345',
      virustotalApiKey: 'vtSecretApiKey98765',
    });

    const settings = gateway.getSettings();
    expect(settings.geminiApiKey).toBe('********');
    expect(settings.virustotalApiKey).toBe('********');
    expect(gateway.getRawKey('gemini')).toBe('AIzaSySecretApiKey12345');
  });
});
