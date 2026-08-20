import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParsedRecord, NormalizedEvent } from './types';

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;
const URL_REGEX = /https?:\/\/[^\s$.?#].[^\s]*/gi;

@Injectable()
export class NormalizationService {
  constructor(private readonly prisma: PrismaService) {}

  createContext(datasetId: string, sourceFileId?: string) {
    const entityCache = new Map<string, string>(); // normalizedName -> entityId
    let sequenceCounter = 0;

    return {
      normalize: async (record: ParsedRecord): Promise<NormalizedEvent> => {
        sequenceCounter++;
        const content = record.content || '';
        const charLength = content.length;

        // Word count
        const words = content
          .trim()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 0);
        const wordCount = words.length;

        // Emoji & URL extraction
        const emojis = content.match(EMOJI_REGEX) || [];
        const urls = content.match(URL_REGEX) || [];
        const hasEmojis = emojis.length > 0;
        const hasUrls = urls.length > 0;

        // Actor entity resolution
        let entityId: string | undefined = undefined;
        const actorName = record.actor ? record.actor.trim() : undefined;

        if (actorName) {
          const normKey = actorName.toLowerCase();
          if (entityCache.has(normKey)) {
            entityId = entityCache.get(normKey);
          } else {
            // Find or create Entity in database
            let entity = await this.prisma.entity.findUnique({
              where: { normalizedId: normKey },
            });

            if (!entity) {
              const id = `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              entity = await this.prisma.entity.create({
                data: {
                  id,
                  displayName: actorName,
                  normalizedId: normKey,
                  entityType: 'person',
                },
              });
            }

            entityId = entity.id;
            entityCache.set(normKey, entity.id);
          }
        }

        const metadataObj = {
          ...(record.metadata || {}),
          ...(hasUrls ? { urls: Array.from(new Set(urls)) } : {}),
          ...(hasEmojis ? { emojis: Array.from(new Set(emojis)) } : {}),
        };

        const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${sequenceCounter}`;

        return {
          id,
          datasetId,
          sourceFileId,
          entityId,
          actor: actorName,
          actorName,
          timestamp: record.timestamp,
          rawTimestamp: record.rawTimestamp,
          sequenceNum: sequenceCounter,
          content,
          eventType: record.eventType || 'message',
          charLength,
          wordCount,
          hasUrls,
          hasEmojis,
          hasMedia: Boolean(record.hasMedia),
          metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : undefined,
        };
      },
    };
  }
}
