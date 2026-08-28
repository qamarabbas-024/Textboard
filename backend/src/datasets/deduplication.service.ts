import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface DeduplicationOptions {
  exactMatchOnly?: boolean;
  timeWindowSeconds?: number;
  normalizeWhitespace?: boolean;
}

export interface DeduplicationResult<T> {
  unique: T[];
  duplicatesRemoved: number;
  duplicateIds: string[];
}

@Injectable()
export class DeduplicationService {
  private readonly logger = new Logger(DeduplicationService.name);

  /**
   * Generates a deterministic content fingerprint for duplicate detection.
   */
  generateFingerprint(content: string, actor: string | null, normalize = true): string {
    let cleanContent = content || '';
    if (normalize) {
      cleanContent = cleanContent.trim().toLowerCase().replace(/\s+/g, ' ');
    }
    const cleanActor = (actor || '').trim().toLowerCase();
    return crypto.createHash('sha256').update(`${cleanActor}:::${cleanContent}`).digest('hex');
  }

  /**
   * Deduplicates an array of timeline events using cryptographic fingerprints and temporal proximity.
   */
  deduplicateEvents<T extends { id: string; content: string; actor: string | null; timestamp: Date }>(
    events: T[],
    options: DeduplicationOptions = {},
  ): DeduplicationResult<T> {
    const timeWindowMs = (options.timeWindowSeconds || 120) * 1000;
    const seenFingerprints = new Map<string, Date>();
    const unique: T[] = [];
    const duplicateIds: string[] = [];

    for (const event of events) {
      const fp = this.generateFingerprint(event.content, event.actor, options.normalizeWhitespace !== false);
      const lastSeen = seenFingerprints.get(fp);

      if (lastSeen) {
        const timeDiff = Math.abs(event.timestamp.getTime() - lastSeen.getTime());
        if (options.exactMatchOnly || timeDiff <= timeWindowMs) {
          duplicateIds.push(event.id);
          continue;
        }
      }

      seenFingerprints.set(fp, event.timestamp);
      unique.push(event);
    }

    this.logger.log(
      `Deduplication completed: processed ${events.length} events, eliminated ${duplicateIds.length} duplicates.`,
    );

    return {
      unique,
      duplicatesRemoved: duplicateIds.length,
      duplicateIds,
    };
  }
}
