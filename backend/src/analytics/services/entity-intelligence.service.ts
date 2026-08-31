import { Injectable, Logger } from '@nestjs/common';

export interface CryptoHit {
  type: 'BITCOIN' | 'ETHEREUM' | 'TRC20_USDT' | 'SOLANA';
  address: string;
  count: number;
  actors: string[];
}

export interface IpHit {
  ip: string;
  version: 'IPv4' | 'IPv6';
  isPrivate: boolean;
  count: number;
  actors: string[];
}

export interface FinancialHit {
  type: 'CREDIT_CARD' | 'IBAN' | 'CURRENCY_AMOUNT';
  value: string;
  maskedValue?: string;
  currency?: string;
  amount?: number;
  count: number;
  actors: string[];
}

export interface TelecomHit {
  rawNumber: string;
  countryCode?: string;
  countryName?: string;
  isBurnerVoipSuspect: boolean;
  count: number;
  actors: string[];
}

export interface EntityIntelligenceReport {
  cryptoWallets: CryptoHit[];
  ipAddresses: IpHit[];
  financialEntities: FinancialHit[];
  telecomEntities: TelecomHit[];
  totalUniqueEntities: number;
}

// Country code map for forensic phone profiling
const COUNTRY_CODES: Record<string, string> = {
  '1': 'USA / Canada',
  '44': 'United Kingdom',
  '92': 'Pakistan',
  '91': 'India',
  '971': 'United Arab Emirates',
  '966': 'Saudi Arabia',
  '49': 'Germany',
  '33': 'France',
  '86': 'China',
  '81': 'Japan',
  '7': 'Russia',
  '90': 'Turkey',
  '98': 'Iran',
};

@Injectable()
export class EntityIntelligenceService {
  private readonly logger = new Logger(EntityIntelligenceService.name);

  // Regex definitions
  private readonly BTC_REGEX = /\b(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g;
  private readonly ETH_REGEX = /\b0x[a-fA-F0-9]{40}\b/g;
  private readonly TRC20_REGEX = /\bT[A-Za-z1-9]{33}\b/g;
  private readonly SOL_REGEX = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

  private readonly IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  private readonly IBAN_REGEX = /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g;
  private readonly CC_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
  private readonly MONEY_REGEX = /(?:[$€£¥₨]|PKR|USD|EUR|GBP|AED|USDT)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/gi;
  private readonly PHONE_REGEX = /(?:\+?(\d{1,3}))?[-.\s]?\(?(\d{2,4})\)?[-.\s]?(\d{3,4})[-.\s]?(\d{3,4})\b/g;

  /**
   * Runs offline forensic entity extraction over communication events
   */
  scanDatasetEntities(
    events: Array<{ id: string; actor: string | null; content: string; timestamp: Date }>,
  ): EntityIntelligenceReport {
    const cryptoMap = new Map<string, { type: CryptoHit['type']; count: number; actors: Set<string> }>();
    const ipMap = new Map<string, { version: 'IPv4' | 'IPv6'; isPrivate: boolean; count: number; actors: Set<string> }>();
    const finMap = new Map<string, { type: FinancialHit['type']; maskedValue?: string; count: number; actors: Set<string> }>();
    const telecomMap = new Map<string, { countryCode?: string; countryName?: string; isBurnerVoipSuspect: boolean; count: number; actors: Set<string> }>();

    for (const ev of events) {
      const text = ev.content || '';
      const actor = ev.actor || 'Unknown';

      // 1. Crypto Wallet Extraction
      const btcMatches = text.match(this.BTC_REGEX) || [];
      btcMatches.forEach((addr: string) => this.recordHit(cryptoMap, addr, 'BITCOIN', actor));

      const ethMatches = text.match(this.ETH_REGEX) || [];
      ethMatches.forEach((addr: string) => this.recordHit(cryptoMap, addr, 'ETHEREUM', actor));

      const trcMatches = text.match(this.TRC20_REGEX) || [];
      trcMatches.forEach((addr: string) => this.recordHit(cryptoMap, addr, 'TRC20_USDT', actor));

      // 2. IP Address Extraction
      const ipMatches = text.match(this.IPV4_REGEX) || [];
      ipMatches.forEach((ip: string) => {
        const isPrivate = this.isPrivateIp(ip);
        if (!ipMap.has(ip)) {
          ipMap.set(ip, { version: 'IPv4', isPrivate, count: 0, actors: new Set() });
        }
        const entry = ipMap.get(ip)!;
        entry.count++;
        entry.actors.add(actor);
      });

      // 3. Financial Extraction (IBAN, Credit Cards with Luhn Check, Money)
      const ibanMatches = text.match(this.IBAN_REGEX) || [];
      ibanMatches.forEach((iban: string) => {
        if (this.isValidIban(iban)) {
          this.recordFinHit(finMap, iban, 'IBAN', actor, `${iban.slice(0, 4)}...${iban.slice(-4)}`);
        }
      });

      const ccMatches = text.match(this.CC_REGEX) || [];
      ccMatches.forEach((rawCc: string) => {
        const cleaned = rawCc.replace(/[-\s]/g, '');
        if (this.passesLuhnCheck(cleaned)) {
          const masked = `****-****-****-${cleaned.slice(-4)}`;
          this.recordFinHit(finMap, cleaned, 'CREDIT_CARD', actor, masked);
        }
      });

      const moneyMatches = text.match(this.MONEY_REGEX) || [];
      moneyMatches.forEach((m: string) => {
        this.recordFinHit(finMap, m.trim(), 'CURRENCY_AMOUNT', actor);
      });

      // 4. Telecom Profiling
      const phoneMatches = text.match(/\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{3,9}\b/g) || [];
      phoneMatches.forEach((phone: string) => {
        const clean = phone.replace(/[^\d+]/g, '');
        if (clean.length >= 8 && clean.length <= 16) {
          const numDigits = clean.replace(/^\+/, '');
          let prefix: string | undefined = undefined;
          for (const p of ['971', '966', '92', '91', '49', '44', '33', '86', '81', '90', '98', '7', '1']) {
            if (numDigits.startsWith(p)) {
              prefix = p;
              break;
            }
          }
          const countryName = prefix ? COUNTRY_CODES[prefix] : undefined;
          const isBurnerVoipSuspect = clean.startsWith('+18') || clean.startsWith('+19') || clean.startsWith('+4470');

          if (!telecomMap.has(clean)) {
            telecomMap.set(clean, {
              countryCode: prefix,
              countryName,
              isBurnerVoipSuspect,
              count: 0,
              actors: new Set(),
            });
          }
          const entry = telecomMap.get(clean)!;
          entry.count++;
          entry.actors.add(actor);
        }
      });
    }

    const cryptoWallets: CryptoHit[] = Array.from(cryptoMap.entries()).map(([address, v]) => ({
      address,
      type: v.type,
      count: v.count,
      actors: Array.from(v.actors),
    }));

    const ipAddresses: IpHit[] = Array.from(ipMap.entries()).map(([ip, v]) => ({
      ip,
      version: v.version,
      isPrivate: v.isPrivate,
      count: v.count,
      actors: Array.from(v.actors),
    }));

    const financialEntities: FinancialHit[] = Array.from(finMap.entries()).map(([value, v]) => ({
      value,
      maskedValue: v.maskedValue,
      type: v.type,
      count: v.count,
      actors: Array.from(v.actors),
    }));

    const telecomEntities: TelecomHit[] = Array.from(telecomMap.entries()).map(([rawNumber, v]) => ({
      rawNumber,
      countryCode: v.countryCode,
      countryName: v.countryName,
      isBurnerVoipSuspect: v.isBurnerVoipSuspect,
      count: v.count,
      actors: Array.from(v.actors),
    }));

    return {
      cryptoWallets,
      ipAddresses,
      financialEntities,
      telecomEntities,
      totalUniqueEntities: cryptoWallets.length + ipAddresses.length + financialEntities.length + telecomEntities.length,
    };
  }

  /**
   * Luhn algorithm for valid credit card validation
   */
  passesLuhnCheck(cardNumber: string): boolean {
    if (!/^\d{13,19}$/.test(cardNumber)) return false;
    let sum = 0;
    let shouldDouble = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  /**
   * ISO 7064 Mod 97 IBAN checksum validator
   */
  isValidIban(iban: string): boolean {
    const clean = iban.replace(/\s+/g, '').toUpperCase();
    if (clean.length < 15 || clean.length > 34) return false;
    const rearranged = clean.slice(4) + clean.slice(0, 4);
    const converted = rearranged
      .split('')
      .map((ch) => {
        const code = ch.charCodeAt(0);
        return code >= 65 && code <= 90 ? (code - 55).toString() : ch;
      })
      .join('');

    let remainder = 0;
    for (let i = 0; i < converted.length; i++) {
      remainder = (remainder * 10 + parseInt(converted.charAt(i), 10)) % 97;
    }
    return remainder === 1;
  }

  isPrivateIp(ip: string): boolean {
    return (
      /^10\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
      /^127\./.test(ip)
    );
  }

  private recordHit(
    map: Map<string, { type: CryptoHit['type']; count: number; actors: Set<string> }>,
    key: string,
    type: CryptoHit['type'],
    actor: string,
  ) {
    if (!map.has(key)) {
      map.set(key, { type, count: 0, actors: new Set() });
    }
    const entry = map.get(key)!;
    entry.count++;
    entry.actors.add(actor);
  }

  private recordFinHit(
    map: Map<string, { type: FinancialHit['type']; maskedValue?: string; count: number; actors: Set<string> }>,
    key: string,
    type: FinancialHit['type'],
    actor: string,
    maskedValue?: string,
  ) {
    if (!map.has(key)) {
      map.set(key, { type, maskedValue, count: 0, actors: new Set() });
    }
    const entry = map.get(key)!;
    entry.count++;
    entry.actors.add(actor);
  }
}
