import { SemanticSearchService } from './semantic-search.service';

describe('SemanticSearchService (Offline BM25 & Cosine Similarity)', () => {
  let service: SemanticSearchService;

  beforeEach(() => {
    service = new SemanticSearchService();
  });

  it('should accurately compute BM25 ranking prioritizing relevant documents', () => {
    const docs = [
      { id: 'doc1', content: 'Database architecture streaming sink memory bound' },
      { id: 'doc2', content: 'Cooking recipes Italian pizza pasta dough' },
      { id: 'doc3', content: 'Database migration and local storage indexing' },
    ];

    const results = service.rankDocumentsBM25('database architecture', docs);

    expect(results.length).toBe(2);
    expect(results[0].id).toBe('doc1'); // contains both database and architecture
    expect(results[1].id).toBe('doc3'); // contains only database
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('should compute Cosine Similarity between matching and non-matching texts', () => {
    const textA = 'local offline personal data intelligence platform';
    const textB = 'local offline personal workstation platform intelligence';
    const textC = 'gardening plants flowers summer sunlight';

    const simAB = service.calculateCosineSimilarity(textA, textB);
    const simAC = service.calculateCosineSimilarity(textA, textC);

    expect(simAB).toBeGreaterThan(0.80); // High similarity
    expect(simAC).toBe(0); // Zero similarity
  });
});
