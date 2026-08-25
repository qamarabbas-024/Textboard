import * as crypto from 'crypto';
import { ExportManifest } from './types';

export class DataIntegrityVerifier {
  private readonly datasetId: string;
  private readonly exportId: string;

  private expectedSourceCount = 0;
  private expectedFirstId: string | null = null;
  private expectedLastId: string | null = null;

  private renderedCount = 0;
  private failedCount = 0;
  private duplicateCount = 0;

  private firstRenderedId: string | null = null;
  private lastRenderedId: string | null = null;
  private firstRenderedTimestamp: string | null = null;
  private lastRenderedTimestamp: string | null = null;

  private lastTimestampMs = -1;
  private lastSeenId: string | null = null;

  // Exact ID set for 100% deterministic duplicate detection without false positives
  private readonly seenIds = new Set<string>();
  private readonly hasher = crypto.createHash('sha256');
  private readonly diagnostics: string[] = [];
  private readonly startTime = Date.now();

  constructor(datasetId: string, exportId: string) {
    this.datasetId = datasetId;
    this.exportId = exportId;
  }

  /**
   * Set expected source baseline from database query before rendering
   */
  setExpectedSource(count: number, firstId?: string | null, lastId?: string | null) {
    this.expectedSourceCount = count;
    this.expectedFirstId = firstId || null;
    this.expectedLastId = lastId || null;
  }

  /**
   * Called sequentially for every message rendered into the PDF
   */
  onMessageRendered(event: {
    id: string;
    timestamp: Date | string | number;
    content: string;
    actor?: string | null;
  }) {
    const eventTimeMs = new Date(event.timestamp).getTime();

    // Exact duplicate detection
    if (this.lastSeenId && this.lastSeenId === event.id) {
      this.duplicateCount++;
      this.diagnostics.push(`Duplicate message ID encountered consecutively: ${event.id}`);
    } else if (this.seenIds.has(event.id)) {
      this.duplicateCount++;
      this.diagnostics.push(`Duplicate message ID encountered during export: ${event.id}`);
    } else {
      this.seenIds.add(event.id);
    }
    this.lastSeenId = event.id;

    // Check chronological order progression
    if (this.lastTimestampMs > 0 && eventTimeMs < this.lastTimestampMs) {
      this.diagnostics.push(
        `Chronological regression detected at message ID ${event.id}: ${eventTimeMs} < ${this.lastTimestampMs}`,
      );
    }
    this.lastTimestampMs = eventTimeMs;

    // Track boundary IDs
    if (this.renderedCount === 0) {
      this.firstRenderedId = event.id;
      this.firstRenderedTimestamp = new Date(event.timestamp).toISOString();
    }
    this.lastRenderedId = event.id;
    this.lastRenderedTimestamp = new Date(event.timestamp).toISOString();

    // Feed deterministic rolling hash
    this.hasher.update(`${event.id}|${eventTimeMs}|${event.content || ''}\n`);

    this.renderedCount++;
  }

  /**
   * Called if rendering of an individual message failed
   */
  onMessageFailed(eventId: string, reason: string) {
    this.failedCount++;
    this.diagnostics.push(`Message render failure [ID: ${eventId}]: ${reason}`);
  }

  /**
   * Validates all integrity invariants and produces the final signed manifest
   */
  finalize(): { isValid: boolean; manifest: ExportManifest } {
    const missingCount = Math.max(0, this.expectedSourceCount - this.renderedCount);

    if (this.expectedSourceCount > 0 && this.renderedCount !== this.expectedSourceCount) {
      this.diagnostics.push(
        `Record count mismatch: Source contained ${this.expectedSourceCount} messages, but ${this.renderedCount} were rendered (Missing: ${missingCount}).`,
      );
    }

    if (this.duplicateCount > 0) {
      this.diagnostics.push(`Integrity violation: ${this.duplicateCount} duplicate messages detected.`);
    }

    if (this.failedCount > 0) {
      this.diagnostics.push(`Integrity violation: ${this.failedCount} messages failed to render.`);
    }

    if (this.expectedFirstId && this.firstRenderedId && this.expectedFirstId !== this.firstRenderedId) {
      this.diagnostics.push(
        `Boundary check failed: First message ID mismatch (Expected: ${this.expectedFirstId}, Rendered: ${this.firstRenderedId}).`,
      );
    }

    if (this.expectedLastId && this.lastRenderedId && this.expectedLastId !== this.lastRenderedId) {
      this.diagnostics.push(
        `Boundary check failed: Last message ID mismatch (Expected: ${this.expectedLastId}, Rendered: ${this.lastRenderedId}).`,
      );
    }

    const isValid =
      this.diagnostics.length === 0 &&
      this.renderedCount === this.expectedSourceCount &&
      this.duplicateCount === 0 &&
      this.failedCount === 0;

    const contentChecksum = this.hasher.digest('hex');

    const manifest: ExportManifest = {
      datasetId: this.datasetId,
      exportId: this.exportId,
      sourceMessageCount: this.expectedSourceCount,
      renderedMessageCount: this.renderedCount,
      missingCount,
      duplicateCount: this.duplicateCount,
      failedCount: this.failedCount,
      firstMessageId: this.firstRenderedId,
      lastMessageId: this.lastRenderedId,
      firstMessageTimestamp: this.firstRenderedTimestamp,
      lastMessageTimestamp: this.lastRenderedTimestamp,
      contentChecksum: `sha256:${contentChecksum}`,
      status: isValid ? 'VERIFIED' : 'FAILED',
      diagnostics: this.diagnostics.length > 0 ? this.diagnostics : undefined,
      generatedAt: new Date().toISOString(),
      executionTimeMs: Date.now() - this.startTime,
    };

    return { isValid, manifest };
  }
}
