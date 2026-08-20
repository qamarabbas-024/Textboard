import { Injectable } from '@nestjs/common';
import { IStreamParser } from '../types';
import { TxtStreamParser } from './txt-stream-parser';
import { CsvStreamParser } from './csv-stream-parser';
import { JsonStreamParser } from './json-stream-parser';
import { XlsxStreamParser } from './xlsx-stream-parser';

@Injectable()
export class ParserRegistryService {
  private readonly parsers: IStreamParser[] = [];

  constructor(
    private readonly txtParser: TxtStreamParser,
    private readonly csvParser: CsvStreamParser,
    private readonly jsonParser: JsonStreamParser,
    private readonly xlsxParser: XlsxStreamParser,
  ) {
    this.registerParser(txtParser);
    this.registerParser(csvParser);
    this.registerParser(jsonParser);
    this.registerParser(xlsxParser);
  }

  registerParser(parser: IStreamParser) {
    this.parsers.push(parser);
  }

  getParser(mimeType: string, filename: string): IStreamParser {
    for (const parser of this.parsers) {
      if (parser.canHandle(mimeType, filename)) {
        return parser;
      }
    }

    // Default fallback: plain text stream parser
    return this.txtParser;
  }

  getAllParsers(): IStreamParser[] {
    return [...this.parsers];
  }
}
