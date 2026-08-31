import { Injectable, Logger } from '@nestjs/common';

export interface DatasetSummaryInput {
  id: string;
  name: string;
  sourceType: string;
  totalEvents: number;
  startDate: string;
  endDate: string;
  actors: string[];
  topKeyphrases: string[];
  emojiCounts?: Record<string, number>;
}

export interface CrossDatasetComparisonResult {
  datasetA: { id: string; name: string; totalEvents: number };
  datasetB: { id: string; name: string; totalEvents: number };
  participantOverlap: {
    sharedActors: string[];
    onlyInA: string[];
    onlyInB: string[];
    jaccardSimilarity: number; // 0.0 to 1.0
    diceCoefficient: number; // 0.0 to 1.0
  };
  keyphraseOverlap: {
    sharedKeyphrases: string[];
    jaccardSimilarity: number;
  };
  temporalAlignment: {
    overlapStartDate: string | null;
    overlapEndDate: string | null;
    overlapDays: number;
    relationship: 'CONCURRENT' | 'SEQUENTIAL' | 'DISJOINT';
  };
  correlationScore: number; // 0 - 100 overall forensic correlation
}

@Injectable()
export class CrossDatasetComparatorService {
  private readonly logger = new Logger(CrossDatasetComparatorService.name);

  /**
   * Compares two communication archives for participant overlap, keyphrase intersections, and temporal co-occurrence
   */
  compareDatasets(
    datasetA: DatasetSummaryInput,
    datasetB: DatasetSummaryInput,
  ): CrossDatasetComparisonResult {
    // 1. Participant Overlap & Similarity
    const setA = new Set(datasetA.actors.map((a) => a.toLowerCase().trim()));
    const setB = new Set(datasetB.actors.map((b) => b.toLowerCase().trim()));

    const sharedActors: string[] = [];
    const onlyInA: string[] = [];
    const onlyInB: string[] = [];

    datasetA.actors.forEach((a) => {
      if (setB.has(a.toLowerCase().trim())) {
        if (!sharedActors.includes(a)) sharedActors.push(a);
      } else {
        onlyInA.push(a);
      }
    });

    datasetB.actors.forEach((b) => {
      if (!setA.has(b.toLowerCase().trim())) {
        onlyInB.push(b);
      }
    });

    const unionActors = new Set([...setA, ...setB]);
    const jaccardActors = unionActors.size
      ? parseFloat((sharedActors.length / unionActors.size).toFixed(3))
      : 0;
    const diceActors = (setA.size + setB.size)
      ? parseFloat(((2 * sharedActors.length) / (setA.size + setB.size)).toFixed(3))
      : 0;

    // 2. Keyphrase Overlap
    const keysA = new Set(datasetA.topKeyphrases.map((k) => k.toLowerCase().trim()));
    const keysB = new Set(datasetB.topKeyphrases.map((k) => k.toLowerCase().trim()));

    const sharedKeyphrases: string[] = [];
    keysA.forEach((k) => {
      if (keysB.has(k)) sharedKeyphrases.push(k);
    });

    const unionKeys = new Set([...keysA, ...keysB]);
    const jaccardKeys = unionKeys.size
      ? parseFloat((sharedKeyphrases.length / unionKeys.size).toFixed(3))
      : 0;

    // 3. Temporal Alignment
    const startA = new Date(datasetA.startDate || '1970-01-01').getTime();
    const endA = new Date(datasetA.endDate || '2099-01-01').getTime();
    const startB = new Date(datasetB.startDate || '1970-01-01').getTime();
    const endB = new Date(datasetB.endDate || '2099-01-01').getTime();

    const overlapStart = Math.max(startA, startB);
    const overlapEnd = Math.min(endA, endB);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);
    const overlapDays = Math.round(overlapMs / (1000 * 60 * 60 * 24));

    let relationship: 'CONCURRENT' | 'SEQUENTIAL' | 'DISJOINT' = 'DISJOINT';
    if (overlapDays > 0) {
      relationship = 'CONCURRENT';
    } else if (endA <= startB || endB <= startA) {
      relationship = 'SEQUENTIAL';
    }

    // 4. Composite Forensic Correlation Score (0 - 100)
    // 50% Actor Overlap + 30% Keyphrase Overlap + 20% Temporal Co-occurrence
    const temporalFactor = relationship === 'CONCURRENT' ? 1.0 : relationship === 'SEQUENTIAL' ? 0.3 : 0.0;
    const rawScore = (jaccardActors * 50) + (jaccardKeys * 30) + (temporalFactor * 20);
    const correlationScore = Math.min(100, Math.round(rawScore));

    return {
      datasetA: { id: datasetA.id, name: datasetA.name, totalEvents: datasetA.totalEvents },
      datasetB: { id: datasetB.id, name: datasetB.name, totalEvents: datasetB.totalEvents },
      participantOverlap: {
        sharedActors,
        onlyInA,
        onlyInB,
        jaccardSimilarity: jaccardActors,
        diceCoefficient: diceActors,
      },
      keyphraseOverlap: {
        sharedKeyphrases,
        jaccardSimilarity: jaccardKeys,
      },
      temporalAlignment: {
        overlapStartDate: overlapDays > 0 ? new Date(overlapStart).toISOString() : null,
        overlapEndDate: overlapDays > 0 ? new Date(overlapEnd).toISOString() : null,
        overlapDays,
        relationship,
      },
      correlationScore,
    };
  }
}
