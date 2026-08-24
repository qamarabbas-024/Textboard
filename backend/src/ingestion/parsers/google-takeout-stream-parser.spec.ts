import { GoogleTakeoutStreamParser } from './google-takeout-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('GoogleTakeoutStreamParser (Browser & Search History)', () => {
  const parser = new GoogleTakeoutStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_takeout_test',
    datasetId: 'ds_takeout_test',
    filename: 'MyActivity.json',
  };

  it('should identify Google Takeout and Browser History files', () => {
    expect(parser.canHandle('application/json', 'MyActivity.json')).toBe(true);
    expect(parser.canHandle('application/json', 'BrowserHistory.json')).toBe(true);
    expect(parser.canHandle('application/json', 'Chrome_searches.json')).toBe(true);
    expect(parser.canHandle('application/json', 'custom_data.json')).toBe(false);
  });

  it('should parse Google activity history events with URLs and timestamps', async () => {
    const takeoutData = JSON.stringify([
      {
        header: 'Google Search',
        title: 'Searched for local-first database performance benchmarks',
        titleUrl: 'https://www.google.com/search?q=local-first+database+benchmarks',
        time: '2026-08-24T10:00:00.000Z',
        products: ['Search'],
      },
      {
        header: 'Chrome',
        title: 'Visited TextBoard GitHub Repository',
        titleUrl: 'https://github.com/textboard/textboard',
        time: '2026-08-24T10:05:00.000Z',
        products: ['Chrome'],
      },
    ]);

    const stream = Readable.from([Buffer.from(takeoutData)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);

    expect(records[0].content).toContain('[Search] Searched for local-first database');
    expect(records[0].content).toContain('https://www.google.com/search');
    expect(records[0].urls).toContain('https://www.google.com/search?q=local-first+database+benchmarks');
    expect(records[0].eventType).toBe('browser_activity');

    expect(records[1].content).toContain('[Chrome] Visited TextBoard GitHub Repository');
    expect(records[1].urls).toContain('https://github.com/textboard/textboard');
  });
});
