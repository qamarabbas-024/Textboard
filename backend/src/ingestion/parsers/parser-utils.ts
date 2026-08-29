/**
 * Parser Utilities: Shared regular expressions and extraction helpers for TextBoard V1 Parsers.
 */

// Comprehensive Unicode Emoji pattern (supports composite emojis, flags, skin tone modifiers)
export const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)/gu;

// URL extraction pattern (supports http, https, ftp, localhost, query parameters and paths)
export const URL_REGEX = /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+|\bwww\.[^\s<>"{}|\\^`[\]]+/gi;

/**
 * Extracts unique URLs from text content, stripping trailing punctuation.
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return Array.from(
    new Set(
      matches.map((url) => url.replace(/[),.!?:;]+$/, '')).filter(Boolean),
    ),
  );
}

/**
 * Extracts unique Emojis from text content.
 */
export function extractEmojis(text: string): string[] {
  if (!text) return [];
  const matches = text.match(EMOJI_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

/**
 * Flexible, resilient date parser supporting international formats, timestamps, and ISO strings.
 */
export function parseFlexibleDate(dateStr?: string | Date | number | null): Date {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
  if (typeof dateStr === 'number') {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  const str = String(dateStr).trim();
  if (!str) return new Date();

  // 1. Check direct standard Date parse
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // 2. Handle DD/MM/YYYY or MM/DD/YYYY formats
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?))?/);
  if (slashMatch) {
    const part1 = slashMatch[1];
    const part2 = slashMatch[2];
    let year = slashMatch[3];
    if (year.length === 2) year = `20${year}`;
    const timePart = slashMatch[4] || '00:00:00';

    // Assume DD/MM/YYYY if part1 > 12
    let day = part1;
    let month = part2;
    if (Number(part1) <= 12 && Number(part2) > 12) {
      month = part1;
      day = part2;
    }

    const isoCandidate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}`;
    const parsed = new Date(isoCandidate);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // 3. Handle Unix epoch seconds or milliseconds in string format
  if (/^\d{10,13}$/.test(str)) {
    const num = Number(str);
    const ms = str.length === 10 ? num * 1000 : num;
    const epochDate = new Date(ms);
    if (!isNaN(epochDate.getTime())) return epochDate;
  }

  return new Date();
}

/**
 * Parses a CSV/TSV line respecting quotes, escaped quotes, and custom delimiters.
 */
export function parseDelimitedLine(line: string, delimiter = ','): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Detects the most probable delimiter in a delimited text string (comma, tab, semicolon, pipe).
 */
export function detectDelimiter(sampleLine: string): string {
  const delimiters = [',', '\t', ';', '|'];
  let maxCount = 0;
  let chosen = ',';

  for (const d of delimiters) {
    const count = (sampleLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      chosen = d;
    }
  }

  return chosen;
}
