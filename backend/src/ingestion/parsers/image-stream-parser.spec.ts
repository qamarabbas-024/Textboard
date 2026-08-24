import { ImageStreamParser } from './image-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('ImageStreamParser (Media Attachments & Metadata)', () => {
  const parser = new ImageStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_image_test',
    datasetId: 'ds_image_test',
    filename: 'architecture_diagram.png',
  };

  it('should identify image formats', () => {
    expect(parser.canHandle('image/png', 'photo.png')).toBe(true);
    expect(parser.canHandle('image/jpeg', 'picture.jpg')).toBe(true);
    expect(parser.canHandle('image/webp', 'graphic.webp')).toBe(true);
    expect(parser.canHandle('text/plain', 'text.txt')).toBe(false);
  });

  it('should parse image files into media attachment events', async () => {
    // Minimal mock PNG buffer
    const mockPngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR Chunk
      0x00, 0x00, 0x07, 0x80, // Width: 1920 (0x780)
      0x00, 0x00, 0x04, 0x38, // Height: 1080 (0x438)
      0x08, 0x06, 0x00, 0x00, 0x00,
    ]);

    const stream = Readable.from([mockPngHeader]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(1);
    expect(records[0].actor).toBe('Media Attachment');
    expect(records[0].content).toContain('[Photo: architecture_diagram.png]');
    expect(records[0].content).toContain('1920x1080px');
    expect(records[0].hasMedia).toBe(true);
    expect(records[0].eventType).toBe('media_attachment');
    expect(records[0].metadata.width).toBe(1920);
    expect(records[0].metadata.height).toBe(1080);
  });
});
