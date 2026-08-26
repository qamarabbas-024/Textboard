import { Injectable } from '@nestjs/common';
import { ParsedSearchQuery, SearchParams } from './search.types';

@Injectable()
export class QueryParserService {
  /**
   * Parses free-text and tokenized search syntax into structured query filters.
   * e.g. '"quarterly review" person:Ali after:2025-01-01 emoji:😂 has:urls'
   */
  parseQuery(params: SearchParams): ParsedSearchQuery {
    const rawQuery = (params.q || '').trim();
    let workingText = rawQuery;

    const exactPhrases: string[] = [];
    const actors: string[] = [];
    const emojis: string[] = [];
    let startDate: Date | undefined = params.startDate ? new Date(params.startDate) : undefined;
    let endDate: Date | undefined = params.endDate ? new Date(params.endDate) : undefined;
    let hasUrls: boolean | undefined = undefined;
    let hasMedia: boolean | undefined = undefined;
    let hasEmojis: boolean | undefined = undefined;
    let datasetId: string | undefined = params.datasetId;

    // 1. Direct param overrides
    if (params.actor) actors.push(params.actor.trim());
    if (params.emoji) emojis.push(params.emoji.trim());

    // 2. Extract Quoted Exact Phrases e.g. "important meeting"
    const quoteRegex = /"([^"]+)"/g;
    let quoteMatch: RegExpExecArray | null;
    while ((quoteMatch = quoteRegex.exec(workingText)) !== null) {
      if (quoteMatch[1].trim()) {
        exactPhrases.push(quoteMatch[1].trim());
      }
    }
    workingText = workingText.replace(quoteRegex, ' ');

    // 3. Extract Token Key-Values
    const tokenRegex = /(\b(?:person|from|actor|after|before|since|until|emoji|has|dataset|datasetId)):([^\s]+)/gi;
    let tokenMatch: RegExpExecArray | null;
    const filterChips: Array<{ key: string; value: string; label: string }> = [];

    while ((tokenMatch = tokenRegex.exec(workingText)) !== null) {
      const key = tokenMatch[1].toLowerCase();
      const val = tokenMatch[2].trim();

      switch (key) {
        case 'person':
        case 'from':
        case 'actor':
          actors.push(val);
          filterChips.push({ key: 'from', value: val, label: `From: ${val}` });
          break;
        case 'after':
        case 'since': {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            startDate = d;
            filterChips.push({ key: 'after', value: val, label: `After: ${val}` });
          }
          break;
        }
        case 'before':
        case 'until': {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            endDate = d;
            filterChips.push({ key: 'before', value: val, label: `Before: ${val}` });
          }
          break;
        }
        case 'emoji':
          emojis.push(val);
          filterChips.push({ key: 'emoji', value: val, label: `Emoji: ${val}` });
          break;
        case 'dataset':
        case 'datasetid':
          datasetId = val;
          filterChips.push({ key: 'dataset', value: val, label: `Dataset: ${val}` });
          break;
        case 'has': {
          const flag = val.toLowerCase();
          if (flag === 'url' || flag === 'urls' || flag === 'link' || flag === 'links') {
            hasUrls = true;
            filterChips.push({ key: 'has', value: 'urls', label: 'Has: Links' });
          }
          if (flag === 'media' || flag === 'photo' || flag === 'file' || flag === 'attachment') {
            hasMedia = true;
            filterChips.push({ key: 'has', value: 'media', label: 'Has: Media' });
          }
          if (flag === 'emoji' || flag === 'emojis') {
            hasEmojis = true;
            filterChips.push({ key: 'has', value: 'emojis', label: 'Has: Emojis' });
          }
          break;
        }
      }
    }

    workingText = workingText.replace(tokenRegex, ' ');

    // 4. Remaining free text terms
    const cleanText = workingText.replace(/\s+/g, ' ').trim();

    return {
      rawQuery,
      text: cleanText,
      exactPhrases,
      actors: Array.from(new Set(actors)),
      startDate,
      endDate,
      emojis: Array.from(new Set(emojis)),
      hasUrls,
      hasMedia,
      hasEmojis,
      datasetId,
      filterChips,
    };
  }
}
