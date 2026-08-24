import { DocxStreamParser } from './docx-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('DocxStreamParser', () => {
  const parser = new DocxStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_docx_test',
    datasetId: 'ds_docx_test',
    filename: 'quarterly_architecture_report.docx',
  };

  it('should identify Word document extensions and mime types', () => {
    expect(parser.canHandle('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'report.docx')).toBe(true);
    expect(parser.canHandle('application/octet-stream', 'spec.docx')).toBe(true);
    expect(parser.canHandle('text/plain', 'notes.txt')).toBe(false);
  });

  it('should handle corrupt buffers gracefully without crashing', async () => {
    const corruptBuffer = Buffer.from('this is not a valid zip docx binary stream');
    const stream = Readable.from([corruptBuffer]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(1);
    expect(records[0].eventType).toBe('document_error');
    expect(records[0].content).toContain('Error parsing DOCX');
  });
});
