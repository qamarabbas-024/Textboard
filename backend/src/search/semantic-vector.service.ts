import { Injectable, Logger } from '@nestjs/common';

export const VECTOR_DIMENSIONS = 384;

@Injectable()
export class SemanticVectorService {
  private readonly logger = new Logger(SemanticVectorService.name);
  private readonly idfMap = new Map<string, number>();

  /**
   * Generates a 384-dimensional dense normalized embedding vector for a given text.
   * Uses on-device deterministic subword hash projections and token frequency weighting.
   */
  generateEmbedding(text: string): Float32Array {
    const vector = new Float32Array(VECTOR_DIMENSIONS);
    if (!text || typeof text !== 'string') return vector;

    const normalized = text.toLowerCase().trim();
    const tokens = normalized.match(/[\p{L}\p{N}_]+/gu) || [];
    if (tokens.length === 0) return vector;

    // Project tokens and character n-grams into vector space
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const weight = 1.0 + Math.log(1.0 + (this.idfMap.get(token) || 1.0));

      // Token level projection
      const h1 = this.hashString(token, 0);
      const h2 = this.hashString(token, 1);
      const dim1 = Math.abs(h1) % VECTOR_DIMENSIONS;
      const dim2 = Math.abs(h2) % VECTOR_DIMENSIONS;
      const sign1 = h1 >= 0 ? 1 : -1;
      const sign2 = h2 >= 0 ? 1 : -1;

      vector[dim1] += sign1 * weight;
      vector[dim2] += sign2 * weight * 0.7;

      // Subword tri-grams for typo & morphology resilience
      if (token.length >= 4) {
        for (let j = 0; j <= token.length - 3; j++) {
          const tri = token.slice(j, j + 3);
          const triHash = this.hashString(tri, 2);
          const triDim = Math.abs(triHash) % VECTOR_DIMENSIONS;
          const triSign = triHash >= 0 ? 1 : -1;
          vector[triDim] += triSign * 0.35;
        }
      }
    }

    // L2 Normalize vector to unit length
    let sumSq = 0;
    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      sumSq += vector[i] * vector[i];
    }

    if (sumSq > 0) {
      const norm = Math.sqrt(sumSq);
      for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }

  /**
   * Calculates cosine similarity between two 384-dimensional unit vectors.
   * Since both vectors are L2-normalized, cosine similarity is the dot product.
   */
  calculateCosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
    if (vecA.length !== VECTOR_DIMENSIONS || vecB.length !== VECTOR_DIMENSIONS) {
      return 0;
    }

    let dot = 0;
    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      dot += vecA[i] * vecB[i];
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, (dot + 1) / 2));
  }

  /**
   * Fast 32-bit FNV-1a hash with seed salt
   */
  private hashString(str: string, seed: number): number {
    let h = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h | 0;
  }
}
