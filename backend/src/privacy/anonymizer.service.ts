import { Injectable, Logger } from '@nestjs/common';

export interface AnonymizationOptions {
  maskEmails?: boolean;
  maskPhones?: boolean;
  maskIps?: boolean;
  maskCreditCards?: boolean;
  pseudonymizeActors?: boolean;
  actorMapping?: Record<string, string>;
}

export interface AnonymizedResult {
  text: string;
  actor: string | null;
  redactionCount: number;
}

@Injectable()
export class AnonymizerService {
  private readonly logger = new Logger(AnonymizerService.name);
  private readonly actorMap = new Map<string, string>();
  private actorCounter = 1;

  /**
   * Redacts sensitive personal information from a text snippet and actor label.
   */
  anonymize(
    content: string,
    actor?: string | null,
    options: AnonymizationOptions = {},
  ): AnonymizedResult {
    let sanitizedContent = content || '';
    let redactionCount = 0;

    const opts: AnonymizationOptions = {
      maskEmails: true,
      maskPhones: true,
      maskIps: true,
      maskCreditCards: true,
      pseudonymizeActors: true,
      ...options,
    };

    // 1. Email Redaction
    if (opts.maskEmails) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      sanitizedContent = sanitizedContent.replace(emailRegex, () => {
        redactionCount++;
        return '[EMAIL-REDACTED]';
      });
    }

    // 2. Phone Number Redaction (International & Local formats)
    if (opts.maskPhones) {
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
      sanitizedContent = sanitizedContent.replace(phoneRegex, () => {
        redactionCount++;
        return '[PHONE-REDACTED]';
      });
    }

    // 3. IPv4 / IPv6 Redaction
    if (opts.maskIps) {
      const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
      sanitizedContent = sanitizedContent.replace(ipRegex, () => {
        redactionCount++;
        return '[IP-REDACTED]';
      });
    }

    // 4. Credit Card numbers (Luhn candidate strings)
    if (opts.maskCreditCards) {
      const ccRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
      sanitizedContent = sanitizedContent.replace(ccRegex, () => {
        redactionCount++;
        return '[CARD-REDACTED]';
      });
    }

    // 5. Actor Pseudonymization
    let anonymizedActor: string | null = actor || null;
    if (actor && opts.pseudonymizeActors) {
      if (opts.actorMapping && opts.actorMapping[actor]) {
        anonymizedActor = opts.actorMapping[actor];
      } else {
        if (!this.actorMap.has(actor)) {
          this.actorMap.set(actor, `Participant ${this.actorCounter++}`);
        }
        anonymizedActor = this.actorMap.get(actor)!;
      }
    }

    return {
      text: sanitizedContent,
      actor: anonymizedActor,
      redactionCount,
    };
  }

  /**
   * Resets the active pseudonym cache.
   */
  resetPseudonyms() {
    this.actorMap.clear();
    this.actorCounter = 1;
  }
}
