import { Injectable, Logger } from '@nestjs/common';

export interface OnlineSettings {
  isOnlineModeEnabled: boolean;
  virustotalApiKey?: string;
  abuseIpDbApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  customWebhookUrl?: string;
}

@Injectable()
export class OnlineGatewayService {
  private readonly logger = new Logger(OnlineGatewayService.name);

  private settings: OnlineSettings = {
    isOnlineModeEnabled: false,
    virustotalApiKey: process.env.VIRUSTOTAL_API_KEY || '',
    abuseIpDbApiKey: process.env.ABUSEIPDB_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
  };

  /**
   * Retrieves current network mode and active integration keys
   */
  getSettings(): OnlineSettings {
    return {
      ...this.settings,
      virustotalApiKey: this.settings.virustotalApiKey ? '********' : '',
      abuseIpDbApiKey: this.settings.abuseIpDbApiKey ? '********' : '',
      geminiApiKey: this.settings.geminiApiKey ? '********' : '',
      openaiApiKey: this.settings.openaiApiKey ? '********' : '',
      claudeApiKey: this.settings.claudeApiKey ? '********' : '',
    };
  }

  /**
   * Updates online mode status and API credentials
   */
  updateSettings(newSettings: Partial<OnlineSettings>): OnlineSettings {
    if (newSettings.isOnlineModeEnabled !== undefined) {
      this.settings.isOnlineModeEnabled = newSettings.isOnlineModeEnabled;
      this.logger.log(`TextBoard Network Policy updated: ${this.settings.isOnlineModeEnabled ? '🌐 ONLINE ENHANCED' : '🔒 AIRGAP OFFLINE'}`);
    }

    if (newSettings.virustotalApiKey && newSettings.virustotalApiKey !== '********') {
      this.settings.virustotalApiKey = newSettings.virustotalApiKey;
    }
    if (newSettings.abuseIpDbApiKey && newSettings.abuseIpDbApiKey !== '********') {
      this.settings.abuseIpDbApiKey = newSettings.abuseIpDbApiKey;
    }
    if (newSettings.geminiApiKey && newSettings.geminiApiKey !== '********') {
      this.settings.geminiApiKey = newSettings.geminiApiKey;
    }
    if (newSettings.openaiApiKey && newSettings.openaiApiKey !== '********') {
      this.settings.openaiApiKey = newSettings.openaiApiKey;
    }
    if (newSettings.claudeApiKey && newSettings.claudeApiKey !== '********') {
      this.settings.claudeApiKey = newSettings.claudeApiKey;
    }
    if (newSettings.customWebhookUrl !== undefined) {
      this.settings.customWebhookUrl = newSettings.customWebhookUrl;
    }

    return this.getSettings();
  }

  /**
   * Enforces airgap invariant: throws error if online operations are requested while airgap is active
   */
  assertOnlineAllowed(operationName: string) {
    if (!this.settings.isOnlineModeEnabled) {
      throw new Error(`Airgap Security Policy Violation: Operation "${operationName}" is blocked while TextBoard is in Offline Airgap Mode.`);
    }
  }

  isOnline(): boolean {
    return this.settings.isOnlineModeEnabled;
  }

  getRawKey(provider: 'virustotal' | 'abuseipdb' | 'gemini' | 'openai' | 'claude'): string {
    switch (provider) {
      case 'virustotal':
        return this.settings.virustotalApiKey || '';
      case 'abuseipdb':
        return this.settings.abuseIpDbApiKey || '';
      case 'gemini':
        return this.settings.geminiApiKey || '';
      case 'openai':
        return this.settings.openaiApiKey || '';
      case 'claude':
        return this.settings.claudeApiKey || '';
      default:
        return '';
    }
  }
}
