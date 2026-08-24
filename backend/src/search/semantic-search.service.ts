import { Injectable, Logger } from '@nestjs/common';

export interface ScoredDocument {
  id: string;
  score: number;
  snippet?: string;
}

const COMMON_STOPWORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'is', 'are', 'was', 'were', 'been', 'has', 'had', 'am',
]);

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  /**
   * Tokenizes text into lowercase normalized terms, stripping punctuation.
   */
  tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((term) => term.length > 1 && !COMMON_STOPWORDS.has(term));
  }

  /**
   * Builds Term Frequency (TF) map for a document.
   */
  getTermFrequencies(terms: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    return tf;
  }

  /**
   * Computes BM25 Okapi relevance score between a query and a document corpus.
   * Parameters: k1 = 1.2, b = 0.75
   */
  rankDocumentsBM25(
    query: string,
    documents: Array<{ id: string; content: string }>,
    k1 = 1.2,
    b = 0.75,
  ): ScoredDocument[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0 || documents.length === 0) {
      return [];
    }

    const N = documents.length;
    let totalLength = 0;
    const docTokensList: string[][] = [];
    const docFreq = new Map<string, number>();

    // 1. First pass: tokenize documents & compute document frequency (DF)
    for (const doc of documents) {
      const tokens = this.tokenize(doc.content);
      docTokensList.push(tokens);
      totalLength += tokens.length;

      const uniqueTerms = new Set(tokens);
      for (const term of uniqueTerms) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
    }

    const avgDocLength = totalLength / Math.max(1, N);

    // 2. Second pass: compute BM25 score for each document
    const results: ScoredDocument[] = [];

    for (let i = 0; i < N; i++) {
      const doc = documents[i];
      const tokens = docTokensList[i];
      const docLength = tokens.length;
      const tfMap = this.getTermFrequencies(tokens);

      let score = 0;

      for (const term of queryTokens) {
        const tf = tfMap.get(term) || 0;
        if (tf === 0) continue;

        const df = docFreq.get(term) || 0;
        // Robertson-Spärck Jones IDF
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (docLength / Math.max(1, avgDocLength)));

        score += idf * (numerator / denominator);
      }

      if (score > 0) {
        results.push({
          id: doc.id,
          score: parseFloat(score.toFixed(4)),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Computes Cosine Similarity between two text vectors.
   */
  calculateCosineSimilarity(textA: string, textB: string): number {
    const tokensA = this.tokenize(textA);
    const tokensB = this.tokenize(textB);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const tfA = this.getTermFrequencies(tokensA);
    const tfB = this.getTermFrequencies(tokensB);

    const allTerms = new Set([...tfA.keys(), ...tfB.keys()]);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const term of allTerms) {
      const countA = tfA.get(term) || 0;
      const countB = tfB.get(term) || 0;
      dotProduct += countA * countB;
      normA += countA * countA;
      normB += countB * countB;
    }

    if (normA === 0 || normB === 0) return 0;
    return parseFloat((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(4));
  }
}
