import { Injectable, Logger } from '@nestjs/common';

export interface BatesConfig {
  prefix: string; // e.g. "EXHIBIT-A", "SEC-CASE", "TXT"
  startNumber: number; // e.g. 1
  digits: number; // e.g. 4 -> "0001"
  suffix?: string; // e.g. "-CONFIDENTIAL"
  enableRedaction?: boolean;
  redactCreditCards?: boolean;
  redactPhoneNumbers?: boolean;
  redactCryptoWallets?: boolean;
  redactIpAddresses?: boolean;
  customKeywords?: string[];
}

export interface BatesStampedEvent {
  batesNumber: string;
  originalId: string;
  actor: string;
  content: string;
  timestamp: string;
  redactionsCount: number;
}

export interface BatesStampingResult {
  totalStamped: number;
  totalRedactions: number;
  firstBatesNumber: string;
  lastBatesNumber: string;
  events: BatesStampedEvent[];
}

@Injectable()
export class BatesStampingService {
  private readonly logger = new Logger(BatesStampingService.name);

  private readonly CC_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  private readonly PHONE_REGEX = /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{3,9}\b/g;
  private readonly CRYPTO_REGEX = /\b(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|0x[a-fA-F0-9]{40}|T[A-Za-z1-9]{33})\b/g;
  private readonly IP_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

  /**
   * Generates sequential legal Bates stamping and applies redaction filters to communication events
   */
  applyBatesStamping(
    events: Array<{ id: string; actor: string | null; content: string; timestamp: Date | string }>,
    config: BatesConfig,
  ): BatesStampingResult {
    const prefix = (config.prefix || 'EXHIBIT').toUpperCase().trim();
    const digits = Math.max(config.digits || 4, 3);
    const startNum = config.startNumber || 1;
    const suffix = config.suffix ? `-${config.suffix.trim()}` : '';

    let totalRedactions = 0;
    const stampedEvents: BatesStampedEvent[] = [];

    events.forEach((ev, idx) => {
      const currentNumber = startNum + idx;
      const paddedNumber = currentNumber.toString().padStart(digits, '0');
      const batesNumber = `${prefix}-${paddedNumber}${suffix}`;

      let content = ev.content || '';
      let eventRedactions = 0;

      if (config.enableRedaction) {
        if (config.redactCreditCards) {
          content = content.replace(this.CC_REGEX, () => {
            eventRedactions++;
            return '[REDACTED: FINANCIAL CARD]';
          });
        }

        if (config.redactPhoneNumbers) {
          content = content.replace(this.PHONE_REGEX, () => {
            eventRedactions++;
            return '[REDACTED: PHONE NUMBER]';
          });
        }

        if (config.redactCryptoWallets) {
          content = content.replace(this.CRYPTO_REGEX, () => {
            eventRedactions++;
            return '[REDACTED: CRYPTO WALLET]';
          });
        }

        if (config.redactIpAddresses) {
          content = content.replace(this.IP_REGEX, () => {
            eventRedactions++;
            return '[REDACTED: IP ADDRESS]';
          });
        }

        if (config.customKeywords && config.customKeywords.length > 0) {
          for (const kw of config.customKeywords) {
            if (kw && kw.trim().length > 0) {
              const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
              content = content.replace(regex, () => {
                eventRedactions++;
                return '[REDACTED: SENSITIVE]';
              });
            }
          }
        }
      }

      totalRedactions += eventRedactions;

      stampedEvents.push({
        batesNumber,
        originalId: ev.id,
        actor: ev.actor || 'Unknown',
        content,
        timestamp: typeof ev.timestamp === 'string' ? ev.timestamp : ev.timestamp.toISOString(),
        redactionsCount: eventRedactions,
      });
    });

    const firstBatesNumber = stampedEvents.length > 0 ? stampedEvents[0].batesNumber : '';
    const lastBatesNumber = stampedEvents.length > 0 ? stampedEvents[stampedEvents.length - 1].batesNumber : '';

    return {
      totalStamped: stampedEvents.length,
      totalRedactions,
      firstBatesNumber,
      lastBatesNumber,
      events: stampedEvents,
    };
  }
}
