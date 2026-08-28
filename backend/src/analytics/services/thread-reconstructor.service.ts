import { Injectable, Logger } from '@nestjs/common';
import { EventSummaryRow } from './message-analytics.service';

export interface ConversationThread {
  id: string;
  topicTitle: string;
  initiator: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  messageCount: number;
  participants: string[];
  sampleMessages: Array<{
    id: string;
    actor: string | null;
    timestamp: Date;
    content: string;
  }>;
}

export interface ThreadTreeNode {
  id: string;
  actor: string | null;
  timestamp: string;
  content: string;
  depth: number;
  quotedActor?: string;
  quotedSnippet?: string;
  children: ThreadTreeNode[];
}

export interface ThreadReconstructionReport {
  datasetId: string;
  totalThreads: number;
  threads: ConversationThread[];
  computedAt: string;
}

@Injectable()
export class ThreadReconstructorService {
  private readonly logger = new Logger(ThreadReconstructorService.name);

  /**
   * Reconstructs discrete conversational threads from linear chat streams.
   */
  reconstructThreads(datasetId: string, events: EventSummaryRow[]): ThreadReconstructionReport {
    if (!events || events.length === 0) {
      return {
        datasetId,
        totalThreads: 0,
        threads: [],
        computedAt: new Date().toISOString(),
      };
    }

    const threads: ConversationThread[] = [];
    const maxGapMinutes = 15; // 15 mins gap starts a new thread

    let currentThreadEvents: EventSummaryRow[] = [];

    const finalizeThread = (chunk: EventSummaryRow[]) => {
      if (chunk.length < 3) return; // Only treat 3+ message exchanges as a full thread

      const firstEv = chunk[0];
      const lastEv = chunk[chunk.length - 1];
      const durationMs = new Date(lastEv.timestamp).getTime() - new Date(firstEv.timestamp).getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

      const participants = Array.from(
        new Set(chunk.map((e) => e.actor || 'Unknown').filter((a) => a !== 'System')),
      );

      // Synthesize thread title from initial message
      let topicTitle = firstEv.content ? firstEv.content.slice(0, 60) : 'Discussion Thread';
      if (firstEv.content && firstEv.content.length > 60) {
        topicTitle += '...';
      }

      threads.push({
        id: `thread_${firstEv.id}`,
        topicTitle,
        initiator: firstEv.actor || 'User',
        startTime: new Date(firstEv.timestamp).toISOString(),
        endTime: new Date(lastEv.timestamp).toISOString(),
        durationMinutes,
        messageCount: chunk.length,
        participants,
        sampleMessages: chunk.slice(0, 6).map((e) => ({
          id: e.id,
          actor: e.actor,
          timestamp: e.timestamp,
          content: e.content,
        })),
      });
    };

    for (let i = 0; i < events.length; i++) {
      const curEv = events[i];
      if (currentThreadEvents.length === 0) {
        currentThreadEvents.push(curEv);
        continue;
      }

      const prevEv = currentThreadEvents[currentThreadEvents.length - 1];
      const timeDiffMinutes =
        (new Date(curEv.timestamp).getTime() - new Date(prevEv.timestamp).getTime()) / 60000;

      if (timeDiffMinutes <= maxGapMinutes) {
        currentThreadEvents.push(curEv);
      } else {
        finalizeThread(currentThreadEvents);
        currentThreadEvents = [curEv];
      }
    }

    if (currentThreadEvents.length > 0) {
      finalizeThread(currentThreadEvents);
    }

    // Sort threads by messageCount desc
    threads.sort((a, b) => b.messageCount - a.messageCount);

    return {
      datasetId,
      totalThreads: threads.length,
      threads: threads.slice(0, 30),
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Constructs an interactive nested reply quote tree from linear messages.
   */
  buildReplyHierarchyTree(events: EventSummaryRow[]): ThreadTreeNode[] {
    if (!events || events.length === 0) return [];

    const rootNodes: ThreadTreeNode[] = [];
    const quoteRegex = /^(?:>|“|")\s*(?:\[([^\]]+)\])?\s*(.*?)(?:\n|\r\n|$)/;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const match = ev.content ? ev.content.match(quoteRegex) : null;

      const node: ThreadTreeNode = {
        id: ev.id,
        actor: ev.actor,
        timestamp: new Date(ev.timestamp).toISOString(),
        content: ev.content || '',
        depth: 0,
        quotedActor: match ? match[1] : undefined,
        quotedSnippet: match ? match[2]?.trim() : undefined,
        children: [],
      };

      if (match && rootNodes.length > 0) {
        // Attach as child to previous root or parent
        const parent = rootNodes[rootNodes.length - 1];
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }
}
