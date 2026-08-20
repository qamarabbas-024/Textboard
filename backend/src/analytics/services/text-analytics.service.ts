import { Injectable } from '@nestjs/common';
import { TextAnalytics } from '../analytics.types';
import { EventSummaryRow } from './message-analytics.service';

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
  'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'are', 'was', 'were', 'been', 'has', 'had', 'did', 'does', 'am', 'pm', 'ok', 'okay', 'yes', 'yeah',
  'hey', 'hi', 'hello', 'image', 'omitted', 'video', 'audio', 'document', 'attached', 'file', 'message', 'deleted',
]);

const URL_REGEX = /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+|\bwww\.[^\s<>"{}|\\^`[\]]+/gi;
const MENTION_REGEX = /(?:^|\s)@([a-zA-Z0-9_]+)/g;
const WORD_REGEX = /[\p{L}\p{N}]{3,}/gu;

@Injectable()
export class TextAnalyticsService {
  /**
   * High-performance single-pass tokenization and frequency analysis.
   */
  computeTextAnalytics(events: EventSummaryRow[]): TextAnalytics {
    let totalWords = 0;
    const wordCounts = new Map<string, number>();
    const phraseCounts = new Map<string, number>();
    const urlCounts = new Map<string, { url: string; domain: string; count: number }>();
    const domainCounts = new Map<string, number>();
    const mentionCounts = new Map<string, number>();

    for (let i = 0; i < events.length; i++) {
      const content = events[i].content;
      if (!content) continue;

      // 1. URLs & Domains
      if (content.includes('http://') || content.includes('https://') || content.includes('www.')) {
        const urls = content.match(URL_REGEX);
        if (urls) {
          for (let u = 0; u < urls.length; u++) {
            const rawUrl = urls[u];
            const formattedUrl = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;
            let domain = 'unknown';
            try {
              domain = new URL(formattedUrl).hostname.replace(/^www\./, '');
            } catch {
              domain = formattedUrl.split('/')[0];
            }

            const existing = urlCounts.get(formattedUrl);
            if (existing) {
              existing.count++;
            } else {
              urlCounts.set(formattedUrl, { url: formattedUrl, domain, count: 1 });
            }

            domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
          }
        }
      }

      // 2. Mentions
      if (content.includes('@')) {
        let match: RegExpExecArray | null;
        const mentionPattern = /(?:^|\s)@([a-zA-Z0-9_]+)/g;
        while ((match = mentionPattern.exec(content)) !== null) {
          const clean = `@${match[1].toLowerCase()}`;
          mentionCounts.set(clean, (mentionCounts.get(clean) || 0) + 1);
        }
      }

      // 3. Fast Word Matching via Regex Token Iterator (zero string allocations)
      const meaningfulTokens: string[] = [];
      const wordMatches = content.match(WORD_REGEX);

      if (wordMatches) {
        for (let w = 0; w < wordMatches.length; w++) {
          const rawToken = wordMatches[w];
          if (/^\d+$/.test(rawToken)) continue;

          totalWords++;
          const token = rawToken.toLowerCase();

          if (!STOP_WORDS.has(token) && !token.startsWith('http') && !token.startsWith('www')) {
            wordCounts.set(token, (wordCounts.get(token) || 0) + 1);
            meaningfulTokens.push(token);
          }
        }
      }

      // 4. Bigrams (Phrases)
      if (meaningfulTokens.length >= 2) {
        for (let j = 0; j < meaningfulTokens.length - 1; j++) {
          const bigram = `${meaningfulTokens[j]} ${meaningfulTokens[j + 1]}`;
          phraseCounts.set(bigram, (phraseCounts.get(bigram) || 0) + 1);
        }
      }
    }

    const uniqueWords = wordCounts.size;

    // Top words
    const topWords = Array.from(wordCounts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    // Top phrases
    const topPhrases = Array.from(phraseCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([phrase, count]) => ({
        phrase,
        count,
        length: phrase.split(' ').length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // URLs and domains
    const urls = Array.from(urlCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const topDomains = Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Mentions
    const mentions = Array.from(mentionCounts.entries())
      .map(([mention, count]) => ({ mention, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      totalWords,
      uniqueWords,
      topWords,
      topPhrases,
      urls,
      topDomains,
      mentions,
    };
  }
}
