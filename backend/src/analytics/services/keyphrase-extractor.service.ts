import { Injectable, Logger } from '@nestjs/common';

export interface KeyphraseCandidate {
  phrase: string;
  ngram: 1 | 2 | 3;
  tf: number;
  df: number;
  tfidf: number;
  firstSeen: string;
  lastSeen: string;
  actors: string[];
}

export interface KeyphraseAnalysisResult {
  topKeyphrases: KeyphraseCandidate[];
  bigrams: KeyphraseCandidate[];
  trigrams: KeyphraseCandidate[];
  vocabularySize: number;
  totalTokensAnalyzed: number;
}

@Injectable()
export class KeyphraseExtractorService {
  private readonly logger = new Logger(KeyphraseExtractorService.name);

  // Common English and Chat stop words
  private readonly stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
    'did', 'do', 'does', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers',
    'herself', 'him', 'himself', 'his', 'how', 'i', 'i\'m', 'i\'ve', 'if', 'in',
    'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'just', 'let', 'me',
    'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
    'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
    'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would',
    'you', 'your', 'yours', 'yourself', 'yourselves', 'ok', 'okay', 'yeah', 'yes',
    'like', 'will', 'get', 'got', 'also', 'know', 'see', 'good', 'well', 'going',
  ]);

  /**
   * Extracts top N-gram keyphrases and calculates TF-IDF scores across message streams
   */
  extractKeyphrases(
    documents: Array<{ id?: string; text: string; actor?: string | null; timestamp?: Date | string }>,
    topK = 50,
  ): KeyphraseAnalysisResult {
    if (!documents.length) {
      return {
        topKeyphrases: [],
        bigrams: [],
        trigrams: [],
        vocabularySize: 0,
        totalTokensAnalyzed: 0,
      };
    }

    const docCount = documents.length;
    let totalTokensAnalyzed = 0;

    // Track term frequencies and document frequencies
    const termStats = new Map<string, {
      tf: number;
      docs: Set<number>;
      ngram: 1 | 2 | 3;
      firstSeen: string;
      lastSeen: string;
      actors: Set<string>;
    }>();

    documents.forEach((doc, docIdx) => {
      if (!doc.text) return;
      const dateStr = doc.timestamp ? new Date(doc.timestamp).toISOString() : new Date().toISOString();
      const actor = doc.actor || 'Unknown';

      // Clean and tokenize text
      const clean = doc.text
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ') // Strip URLs
        .replace(/[^\w\s-]/g, ' ') // Keep alphanumeric, hyphens
        .replace(/\s+/g, ' ')
        .trim();

      const tokens = clean.split(' ').filter((t) => t.length > 2 && !this.stopWords.has(t) && !/^\d+$/.test(t));
      totalTokensAnalyzed += tokens.length;

      // 1. Unigrams
      for (let i = 0; i < tokens.length; i++) {
        this.recordTerm(tokens[i], 1, docIdx, dateStr, actor, termStats);
      }

      // 2. Bigrams
      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        this.recordTerm(bigram, 2, docIdx, dateStr, actor, termStats);
      }

      // 3. Trigrams
      for (let i = 0; i < tokens.length - 2; i++) {
        const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
        this.recordTerm(trigram, 3, docIdx, dateStr, actor, termStats);
      }
    });

    const candidates: KeyphraseCandidate[] = [];

    for (const [phrase, stat] of termStats.entries()) {
      // Must appear in at least 1 document and have non-trivial frequency
      const df = stat.docs.size;
      const idf = Math.log((docCount + 1) / (df + 1)) + 1;
      const ngramBoost = stat.ngram === 2 ? 1.3 : stat.ngram === 3 ? 1.6 : 1.0;
      const tfidf = parseFloat((stat.tf * idf * ngramBoost).toFixed(2));

      candidates.push({
        phrase,
        ngram: stat.ngram,
        tf: stat.tf,
        df,
        tfidf,
        firstSeen: stat.firstSeen,
        lastSeen: stat.lastSeen,
        actors: Array.from(stat.actors).slice(0, 5),
      });
    }

    // Sort by TF-IDF descending
    candidates.sort((a, b) => b.tfidf - a.tfidf);

    const topKeyphrases = candidates.slice(0, topK);
    const bigrams = candidates.filter((c) => c.ngram === 2).slice(0, Math.floor(topK / 2));
    const trigrams = candidates.filter((c) => c.ngram === 3).slice(0, Math.floor(topK / 3));

    return {
      topKeyphrases,
      bigrams,
      trigrams,
      vocabularySize: termStats.size,
      totalTokensAnalyzed,
    };
  }

  private recordTerm(
    phrase: string,
    ngram: 1 | 2 | 3,
    docIdx: number,
    dateStr: string,
    actor: string,
    map: Map<string, { tf: number; docs: Set<number>; ngram: 1 | 2 | 3; firstSeen: string; lastSeen: string; actors: Set<string> }>,
  ) {
    if (!map.has(phrase)) {
      map.set(phrase, {
        tf: 0,
        docs: new Set(),
        ngram,
        firstSeen: dateStr,
        lastSeen: dateStr,
        actors: new Set(),
      });
    }

    const item = map.get(phrase)!;
    item.tf++;
    item.docs.add(docIdx);
    item.actors.add(actor);
    if (dateStr < item.firstSeen) item.firstSeen = dateStr;
    if (dateStr > item.lastSeen) item.lastSeen = dateStr;
  }
}
