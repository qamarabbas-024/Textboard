import { AiChatStreamParser } from './ai-chat-stream-parser';
import { ParserContext } from '../types';
import { Readable } from 'stream';

describe('AiChatStreamParser', () => {
  const parser = new AiChatStreamParser();
  const dummyContext: ParserContext = {
    jobId: 'job_ai_test',
    datasetId: 'ds_ai_test',
    filename: 'chatgpt_conversations.json',
  };

  it('should identify AI conversation filenames and mime types', () => {
    expect(parser.canHandle('application/json', 'conversations.json')).toBe(true);
    expect(parser.canHandle('application/json', 'chatgpt_export.json')).toBe(true);
    expect(parser.canHandle('application/json', 'claude_history.json')).toBe(true);
    expect(parser.canHandle('text/markdown', 'ai_chat_transcript.md')).toBe(true);
  });

  it('should parse ChatGPT export format with mapping tree', async () => {
    const chatGptExport = [
      {
        id: 'conv-123',
        title: 'Exploring Quantum Physics',
        create_time: 1700000000.0,
        mapping: {
          'node-1': {
            id: 'node-1',
            message: {
              id: 'msg-1',
              author: { role: 'user' },
              create_time: 1700000010.0,
              content: { content_type: 'text', parts: ['What is quantum superposition? 🔥'] },
              metadata: { model_slug: 'gpt-4' },
            },
          },
          'node-2': {
            id: 'node-2',
            message: {
              id: 'msg-2',
              author: { role: 'assistant' },
              create_time: 1700000020.0,
              content: {
                content_type: 'text',
                parts: [
                  'Quantum superposition is a fundamental principle of quantum mechanics. Check https://physics.org for more.',
                ],
              },
              metadata: { model_slug: 'gpt-4' },
            },
          },
        },
      },
    ];

    const stream = Readable.from([JSON.stringify(chatGptExport)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, dummyContext)) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('User (Human)');
    expect(records[0].eventType).toBe('ai_human');
    expect(records[0].content).toContain('What is quantum superposition?');
    expect(records[0].emojis).toContain('🔥');
    expect(records[0].metadata.conversationTitle).toBe('Exploring Quantum Physics');

    expect(records[1].actor).toBe('AI Assistant');
    expect(records[1].eventType).toBe('ai_assistant');
    expect(records[1].content).toContain('Quantum superposition is a fundamental principle');
    expect(records[1].urls).toContain('https://physics.org');
  });

  it('should parse Claude AI export format with chat_messages', async () => {
    const claudeExport = [
      {
        uuid: 'claude-conv-999',
        name: 'Compiler Design Notes',
        chat_messages: [
          {
            uuid: 'cmsg-1',
            sender: 'human',
            text: 'How does LLVM IR optimization work?',
            created_at: '2025-01-10T12:00:00.000Z',
          },
          {
            uuid: 'cmsg-2',
            sender: 'assistant',
            text: 'LLVM optimizes intermediate representation through a series of passes.',
            created_at: '2025-01-10T12:00:05.000Z',
            attachments: [{ file_name: 'diagram.png' }],
          },
        ],
      },
    ];

    const stream = Readable.from([JSON.stringify(claudeExport)]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, {
      ...dummyContext,
      filename: 'claude_conversations.json',
    })) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('User (Human)');
    expect(records[0].content).toContain('How does LLVM IR optimization work?');

    expect(records[1].actor).toBe('AI Assistant');
    expect(records[1].hasMedia).toBe(true);
    expect(records[1].content).toContain('LLVM optimizes intermediate representation');
  });

  it('should parse Markdown AI transcripts with turn headers', async () => {
    const mdTranscript = `
### User:
Can you draft a release summary for TextBoard V1?

### Claude:
Here is the release summary for TextBoard V1:
- 100% Local-first data intelligence
- Verifiable streaming PDF export
`;

    const stream = Readable.from([mdTranscript]);
    const records: any[] = [];
    for await (const rec of parser.parseStream(stream, {
      ...dummyContext,
      filename: 'ai_transcript.md',
    })) {
      records.push(rec);
    }

    expect(records.length).toBe(2);
    expect(records[0].actor).toBe('User (Human)');
    expect(records[0].content).toContain('Can you draft a release summary for TextBoard V1?');

    expect(records[1].actor).toBe('Claude');
    expect(records[1].content).toContain('100% Local-first data intelligence');
  });
});
