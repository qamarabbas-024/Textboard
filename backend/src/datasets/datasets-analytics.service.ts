import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

@Injectable()
export class DatasetsAnalyticsService {
  private readonly logger = new Logger(DatasetsAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHighlights(datasetId: string) {
    const cacheKey = `dataset:${datasetId}:highlights_v2`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const dataset = await this.prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) throw new NotFoundException('Dataset not found');

    // 1. First message ever
    const firstMessage = await this.prisma.timelineEvent.findFirst({
      where: { datasetId, eventType: 'message' },
      orderBy: { timestamp: 'asc' },
    });

    // 2. Longest message (by character length) using SQL
    const longestRows: any[] = await this.prisma.$queryRaw`
      SELECT id, datasetId, timestamp, actor, content, eventType, LENGTH(content) as char_length
      FROM timeline_events
      WHERE datasetId = ${datasetId} AND eventType = 'message'
      ORDER BY LENGTH(content) DESC
      LIMIT 1;
    `;
    const longestMessage = longestRows[0]
      ? {
          id: longestRows[0].id,
          datasetId: longestRows[0].datasetId,
          timestamp: longestRows[0].timestamp != null
            ? typeof longestRows[0].timestamp === 'bigint' || typeof longestRows[0].timestamp === 'number'
              ? new Date(Number(longestRows[0].timestamp)).toISOString()
              : new Date(longestRows[0].timestamp).toISOString()
            : null,
          actor: longestRows[0].actor,
          content: longestRows[0].content,
          eventType: longestRows[0].eventType,
          charLength: Number(longestRows[0].char_length || 0),
        }
      : null;

    // 3. Most emoji-dense message (sample top candidates or scan)
    const emojiRows = await this.prisma.timelineEvent.findMany({
      where: { datasetId, eventType: 'message' },
      select: { id: true, timestamp: true, actor: true, content: true },
      take: 5000,
      orderBy: { timestamp: 'asc' },
    });

    let mostEmojiMessage: any = null;
    let maxEmojis = 0;

    for (const row of emojiRows) {
      const match = row.content?.match(EMOJI_REGEX);
      const count = match ? match.length : 0;
      if (count > maxEmojis) {
        maxEmojis = count;
        mostEmojiMessage = {
          ...row,
          emojiCount: count,
        };
      }
    }

    const result = {
      firstMessage,
      longestMessage,
      mostEmojiMessage: mostEmojiMessage || firstMessage,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async getFirstOccurrence(datasetId: string, keyword: string) {
    if (!keyword || !keyword.trim()) return null;

    const event = await this.prisma.timelineEvent.findFirst({
      where: {
        datasetId,
        content: { contains: keyword.trim() },
      },
      orderBy: { timestamp: 'asc' },
    });

    const totalOccurrences = await this.prisma.timelineEvent.count({
      where: {
        datasetId,
        content: { contains: keyword.trim() },
      },
    });

    return {
      keyword: keyword.trim(),
      firstEvent: event,
      totalOccurrences,
    };
  }

  async getPeopleStats(datasetId: string) {
    const cacheKey = `dataset:${datasetId}:people_stats`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 1. Fetch all actors and message counts
    const actorStats: any[] = await this.prisma.$queryRaw`
      SELECT 
        actor,
        COUNT(*) as message_count,
        SUM(LENGTH(content)) as total_chars,
        MIN(timestamp) as first_active,
        MAX(timestamp) as last_active
      FROM timeline_events
      WHERE datasetId = ${datasetId} AND actor IS NOT NULL
      GROUP BY actor
      ORDER BY message_count DESC;
    `;

    // 2. Response Time & Activity Latency Analysis
    const responseTimesByActor: Record<string, number[]> = {};
    const hourlyDistribution: Record<string, number[]> = {};
    const dailyDistribution: Record<string, number[]> = {};

    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId, actor: { not: null } },
      select: { actor: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    let prevActor: string | null = null;
    let prevTime: number | null = null;

    for (const ev of events) {
      const actor = ev.actor!;
      const time = new Date(ev.timestamp).getTime();
      const date = new Date(ev.timestamp);

      // Hourly (0-23)
      if (!hourlyDistribution[actor]) hourlyDistribution[actor] = new Array(24).fill(0);
      hourlyDistribution[actor][date.getUTCHours()]++;

      // Day of week (0=Sun, 6=Sat)
      if (!dailyDistribution[actor]) dailyDistribution[actor] = new Array(7).fill(0);
      dailyDistribution[actor][date.getUTCDay()]++;

      if (prevActor && prevActor !== actor && prevTime) {
        const diffSecs = (time - prevTime) / 1000;
        if (diffSecs > 0 && diffSecs < 43200) {
          if (!responseTimesByActor[actor]) responseTimesByActor[actor] = [];
          responseTimesByActor[actor].push(diffSecs);
        }
      }

      prevActor = actor;
      prevTime = time;
    }

    const people = actorStats.map((a) => {
      const rTimes = responseTimesByActor[a.actor] || [];
      const avgResponseSecs = rTimes.length > 0
        ? Math.round(rTimes.reduce((acc, v) => acc + v, 0) / rTimes.length)
        : null;

      const sorted = [...rTimes].sort((x, y) => x - y);
      const medianResponseSecs = sorted.length > 0
        ? Math.round(sorted[Math.floor(sorted.length / 2)])
        : null;

      const msgCount = Number(a.message_count || 0);
      const totalChars = Number(a.total_chars || 0);
      const firstActive = a.first_active != null
        ? typeof a.first_active === 'bigint' || typeof a.first_active === 'number'
          ? new Date(Number(a.first_active)).toISOString()
          : new Date(a.first_active).toISOString()
        : null;
      const lastActive = a.last_active != null
        ? typeof a.last_active === 'bigint' || typeof a.last_active === 'number'
          ? new Date(Number(a.last_active)).toISOString()
          : new Date(a.last_active).toISOString()
        : null;

      return {
        actor: a.actor,
        messageCount: msgCount,
        totalChars,
        avgCharsPerMessage: msgCount > 0 ? Math.round(totalChars / msgCount) : 0,
        avgResponseSecs,
        medianResponseSecs,
        firstActive,
        lastActive,
        hourly: hourlyDistribution[a.actor] || new Array(24).fill(0),
        daily: dailyDistribution[a.actor] || new Array(7).fill(0),
      };
    });

    const result = {
      totalParticipants: people.length,
      people,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async getStreaks(datasetId: string) {
    const cacheKey = `dataset:${datasetId}:streaks`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const daysRaw: any[] = await this.prisma.$queryRaw`
      SELECT DISTINCT SUBSTR(timestamp, 1, 10) as day
      FROM timeline_events
      WHERE datasetId = ${datasetId}
      ORDER BY day ASC;
    `;

    if (daysRaw.length === 0) {
      return { longestStreakDays: 0, longestGapDays: 0 };
    }

    let maxStreak = 1;
    let currentStreak = 1;
    let streakStart = daysRaw[0].day;
    let streakEnd = daysRaw[0].day;
    let bestStreakStart = daysRaw[0].day;
    let bestStreakEnd = daysRaw[0].day;

    let maxGapMs = 0;
    let gapStart = daysRaw[0].day;
    let gapEnd = daysRaw[0].day;

    for (let i = 1; i < daysRaw.length; i++) {
      const prev = new Date(daysRaw[i - 1].day).getTime();
      const curr = new Date(daysRaw[i].day).getTime();
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        streakEnd = daysRaw[i].day;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          bestStreakStart = streakStart;
          bestStreakEnd = streakEnd;
        }
      } else {
        const gapMs = curr - prev;
        if (gapMs > maxGapMs) {
          maxGapMs = gapMs;
          gapStart = daysRaw[i - 1].day;
          gapEnd = daysRaw[i].day;
        }
        currentStreak = 1;
        streakStart = daysRaw[i].day;
        streakEnd = daysRaw[i].day;
      }
    }

    const result = {
      longestStreak: {
        days: maxStreak,
        startDate: bestStreakStart,
        endDate: bestStreakEnd,
      },
      longestGap: {
        days: Math.round(maxGapMs / (1000 * 60 * 60 * 24)),
        startDate: gapStart,
        endDate: gapEnd,
      },
      totalActiveDays: daysRaw.length,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  async getMilestones(datasetId: string) {
    const totalCount = await this.prisma.timelineEvent.count({ where: { datasetId } });
    const targetIndices = [1, 100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000];
    const applicable = targetIndices.filter((idx) => idx <= totalCount);

    const milestones = await Promise.all(
      applicable.map(async (index) => {
        const event = await this.prisma.timelineEvent.findFirst({
          where: { datasetId },
          orderBy: { timestamp: 'asc' },
          skip: index - 1,
        });

        return {
          milestoneIndex: index,
          event,
        };
      }),
    );

    return milestones;
  }

  async getOnThisDay(datasetId: string, month?: number, day?: number) {
    const now = new Date();
    const targetMonth = String(month || now.getUTCMonth() + 1).padStart(2, '0');
    const targetDay = String(day || now.getUTCDate()).padStart(2, '0');

    // Matches 'YYYY-MM-DD%'
    const pattern = `%-${targetMonth}-${targetDay}%`;

    const events: any[] = await this.prisma.$queryRaw`
      SELECT id, timestamp, actor, content, eventType
      FROM timeline_events
      WHERE datasetId = ${datasetId}
        AND timestamp LIKE ${pattern}
      ORDER BY timestamp ASC
      LIMIT 100;
    `;

    const sanitizedEvents = events.map((ev) => ({
      ...ev,
      timestamp: ev.timestamp != null
        ? typeof ev.timestamp === 'bigint' || typeof ev.timestamp === 'number'
          ? new Date(Number(ev.timestamp)).toISOString()
          : new Date(ev.timestamp).toISOString()
        : null,
    }));

    return {
      targetMonth: Number(targetMonth),
      targetDay: Number(targetDay),
      events: sanitizedEvents,
    };
  }

  async getRandomMemory(datasetId: string) {
    const count = await this.prisma.timelineEvent.count({
      where: { datasetId, eventType: 'message' },
    });
    if (count === 0) return null;

    const randomIndex = Math.floor(Math.random() * count);
    const event = await this.prisma.timelineEvent.findFirst({
      where: { datasetId, eventType: 'message' },
      skip: randomIndex,
    });

    return event;
  }

  async comparePeople(datasetId: string, actorA: string, actorB: string) {
    const peopleStats = await this.getPeopleStats(datasetId);
    const statA = peopleStats.people.find((p: any) => p.actor === actorA);
    const statB = peopleStats.people.find((p: any) => p.actor === actorB);

    return {
      actorA: statA || null,
      actorB: statB || null,
    };
  }
}
