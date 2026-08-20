import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

@Injectable()
export class EmojiRendererService {
  private readonly logger = new Logger(EmojiRendererService.name);
  private readonly cacheDir: string;
  private readonly memoryCache = new Map<string, Buffer | null>();

  constructor() {
    this.cacheDir = path.resolve(process.cwd(), '.textboard', 'cache', 'emojis');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Converts an emoji string (e.g. '😂') into Twemoji hex string (e.g. '1f602')
   */
  emojiToHex(emoji: string): string {
    return Array.from(emoji)
      .map((c) => c.codePointAt(0)!.toString(16))
      .filter((x) => x !== 'fe0f' && x !== '200d')
      .join('-');
  }

  /**
   * Checks if message content consists only of emojis and whitespace
   */
  isPureEmojiMessage(content: string): boolean {
    const trimmed = (content || '').trim();
    if (!trimmed) return false;
    const stripped = trimmed.replace(EMOJI_REGEX, '').replace(/\s+/g, '');
    return stripped.length === 0;
  }

  /**
   * Extracts all emoji characters from a string
   */
  extractEmojis(content: string): string[] {
    const matches = (content || '').match(EMOJI_REGEX);
    return matches ? Array.from(matches) : [];
  }

  /**
   * Gets or returns the cached PNG image file path for a given emoji
   */
  getEmojiImagePath(emoji: string): string | null {
    const hex = this.emojiToHex(emoji);
    if (!hex) return null;

    const filePath = path.join(this.cacheDir, `${hex}.png`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }

    // Try single primary codepoint if multi-part was not found
    const primaryHex = emoji.codePointAt(0)?.toString(16);
    if (primaryHex) {
      const primaryPath = path.join(this.cacheDir, `${primaryHex}.png`);
      if (fs.existsSync(primaryPath)) {
        return primaryPath;
      }
    }

    return null;
  }

  /**
   * Asynchronously fetches an emoji from Twemoji CDN if not cached
   */
  async fetchEmojiImage(emoji: string): Promise<string | null> {
    const hex = this.emojiToHex(emoji);
    if (!hex) return null;

    const filePath = path.join(this.cacheDir, `${hex}.png`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }

    try {
      const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${hex}.png`;
      await new Promise<void>((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Status ${res.statusCode}`));
          }
          const chunks: Buffer[] = [];
          res.on('data', (d) => chunks.push(d));
          res.on('end', () => {
            fs.writeFileSync(filePath, Buffer.concat(chunks));
            resolve();
          });
        }).on('error', reject);
      });
      return filePath;
    } catch {
      return null;
    }
  }

  /**
   * Cleans text to remove surrogate pair characters that would cause PDF tofu boxes,
   * while keeping text legible.
   */
  sanitizeTextWithoutTofu(content: string): string {
    if (!content) return '';
    return content
      .replace(EMOJI_REGEX, (match) => ` ${match} `)
      .replace(/[\uD800-\uDFFF]/g, '') // remove unmapped surrogate code units that cause boxes
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
