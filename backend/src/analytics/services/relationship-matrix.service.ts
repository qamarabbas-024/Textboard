import { Injectable } from '@nestjs/common';
import { RelationshipPair } from '../analytics.types';
import { EventSummaryRow } from './message-analytics.service';

const INITIATION_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours threshold
const MAX_REPLY_GAP_MS = 2 * 60 * 60 * 1000;  // 2 hours reply window for direct response

@Injectable()
export class RelationshipMatrixService {
  /**
   * Computes relationship pair dynamics across all conversation participants.
   */
  computeRelationships(events: EventSummaryRow[]): RelationshipPair[] {
    // Filter to message events with valid actors
    const validEvents = events
      .filter((e) => Boolean(e.actor) && (e.eventType === 'message' || !e.eventType))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (validEvents.length < 2) return [];

    // Distinct actors
    const actorsSet = new Set<string>();
    for (const e of validEvents) {
      if (e.actor) actorsSet.add(e.actor);
    }
    const actors = Array.from(actorsSet);
    if (actors.length < 2) return [];

    const pairStats = new Map<string, {
      actorA: string;
      actorB: string;
      totalExchanges: number;
      aToBInitiations: number;
      bToAInitiations: number;
      responseTimesAtoB: number[];
      responseTimesBtoA: number[];
    }>();

    const getPairKey = (a: string, b: string) => {
      return a < b ? `${a}:::${b}` : `${b}:::${a}`;
    };

    let prevEvent: EventSummaryRow | null = null;

    for (let i = 0; i < validEvents.length; i++) {
      const current = validEvents[i];
      const currentActor = current.actor!;
      const currentMs = new Date(current.timestamp).getTime();

      if (prevEvent && prevEvent.actor) {
        const prevActor = prevEvent.actor;
        const prevMs = new Date(prevEvent.timestamp).getTime();
        const gapMs = currentMs - prevMs;

        if (prevActor !== currentActor) {
          const key = getPairKey(prevActor, currentActor);
          if (!pairStats.has(key)) {
            const [a, b] = prevActor < currentActor ? [prevActor, currentActor] : [currentActor, prevActor];
            pairStats.set(key, {
              actorA: a,
              actorB: b,
              totalExchanges: 0,
              aToBInitiations: 0,
              bToAInitiations: 0,
              responseTimesAtoB: [],
              responseTimesBtoA: [],
            });
          }

          const stats = pairStats.get(key)!;
          stats.totalExchanges++;

          // Check if this was an initiation after silence
          if (gapMs >= INITIATION_GAP_MS) {
            if (currentActor === stats.actorA) {
              stats.aToBInitiations++;
            } else {
              stats.bToAInitiations++;
            }
          }

          // Check direct reply response time within 2 hours
          if (gapMs > 0 && gapMs <= MAX_REPLY_GAP_MS) {
            const responseSecs = Math.round(gapMs / 1000);
            if (currentActor === stats.actorB && prevActor === stats.actorA) {
              stats.responseTimesAtoB.push(responseSecs);
            } else if (currentActor === stats.actorA && prevActor === stats.actorB) {
              stats.responseTimesBtoA.push(responseSecs);
            }
          }
        }
      }

      prevEvent = current;
    }

    const results: RelationshipPair[] = [];

    for (const stats of pairStats.values()) {
      if (stats.totalExchanges < 2) continue;

      const avgResponseSecsAtoB =
        stats.responseTimesAtoB.length > 0
          ? Math.round(stats.responseTimesAtoB.reduce((a, b) => a + b, 0) / stats.responseTimesAtoB.length)
          : 0;

      const avgResponseSecsBtoA =
        stats.responseTimesBtoA.length > 0
          ? Math.round(stats.responseTimesBtoA.reduce((a, b) => a + b, 0) / stats.responseTimesBtoA.length)
          : 0;

      // Balance ratio: ratio of messages from actor A vs B (0.5 is equal)
      const countA = stats.responseTimesBtoA.length + stats.aToBInitiations;
      const countB = stats.responseTimesAtoB.length + stats.bToAInitiations;
      const total = countA + countB;
      const balanceRatio = total > 0 ? Number((countA / total).toFixed(2)) : 0.5;

      results.push({
        actorA: stats.actorA,
        actorB: stats.actorB,
        totalExchanges: stats.totalExchanges,
        aToBInitiations: stats.aToBInitiations,
        bToAInitiations: stats.bToAInitiations,
        avgResponseSecsAtoB,
        avgResponseSecsBtoA,
        balanceRatio,
        reciprocityScore: Number((1 - Math.abs(balanceRatio - 0.5) * 2).toFixed(2)),
      });
    }

    // Sort by most active interaction pairs
    results.sort((a, b) => b.totalExchanges - a.totalExchanges);
    return results;
  }
}
