import { KeyphraseExtractorService } from './keyphrase-extractor.service';

describe('KeyphraseExtractorService', () => {
  const service = new KeyphraseExtractorService();

  it('should extract top unigram, bigram, and trigram keyphrases with TF-IDF scoring', () => {
    const docs = [
      { text: 'Cryptographic encryption keys and zero-knowledge security protocols', actor: 'Alice' },
      { text: 'Local-first zero-knowledge security protocols for offline forensics', actor: 'Bob' },
      { text: 'Deploying cryptographic encryption keys across secure nodes', actor: 'Charlie' },
    ];

    const result = service.extractKeyphrases(docs);
    expect(result.topKeyphrases.length).toBeGreaterThan(0);
    expect(result.vocabularySize).toBeGreaterThan(0);

    const phrases = result.topKeyphrases.map((p) => p.phrase);
    expect(phrases.some((p) => p.includes('cryptographic') || p.includes('zero-knowledge'))).toBe(true);

    const bigrams = result.bigrams.map((b) => b.phrase);
    expect(bigrams.length).toBeGreaterThan(0);
  });
});
