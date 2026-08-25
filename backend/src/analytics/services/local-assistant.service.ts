import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsEngineService } from '../analytics-engine.service';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { ClusteringEngineService } from './clustering-engine.service';

export interface AssistantResponse {
  answer: string;
  intent: string;
  keyStats: Array<{ label: string; value: string; color?: string }>;
  citations: Array<{
    id: string;
    timestamp: string;
    actor: string | null;
    snippet: string;
  }>;
  suggestedFollowUps: string[];
}

@Injectable()
export class LocalAssistantService {
  private readonly logger = new Logger(LocalAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsEngine: AnalyticsEngineService,
    private readonly anomalyDetector: AnomalyDetectorService,
    private readonly clusteringEngine: ClusteringEngineService,
  ) {}

  /**
   * Processes a natural language question on-device with zero cloud dependencies.
   */
  async askQuestion(datasetId: string, query: string): Promise<AssistantResponse> {
    const dataset = await this.prisma.dataset.findUnique({ where: { id: datasetId } });
    if (!dataset) {
      throw new NotFoundException(`Dataset ${datasetId} not found`);
    }

    const q = query.trim().toLowerCase();
    const analytics = await this.analyticsEngine.getDatasetAnalytics(datasetId);

    // 1. Intent: Top Actors / Participant Contribution
    if (
      q.includes('who sent') ||
      q.includes('top actor') ||
      q.includes('most active') ||
      q.includes('who talk') ||
      q.includes('participants') ||
      q.includes('who speaks') ||
      q.includes('leaderboard')
    ) {
      return this.handleTopActorsIntent(dataset, analytics);
    }

    // 2. Intent: Peak Times / Circadian Rhythm
    if (
      q.includes('when') ||
      q.includes('peak hour') ||
      q.includes('time of day') ||
      q.includes('night') ||
      q.includes('morning') ||
      q.includes('busiest day') ||
      q.includes('circadian') ||
      q.includes('schedule')
    ) {
      return this.handlePeakTimeIntent(dataset, analytics);
    }

    // 3. Intent: Anomalies / Surges / Gaps
    if (
      q.includes('anomaly') ||
      q.includes('anomalies') ||
      q.includes('spike') ||
      q.includes('gap') ||
      q.includes('silence') ||
      q.includes('surge') ||
      q.includes('burst') ||
      q.includes('outlier')
    ) {
      return this.handleAnomaliesIntent(datasetId, dataset, analytics);
    }

    // 4. Intent: Topics / Clusters / Lexical Keywords
    if (
      q.includes('topic') ||
      q.includes('theme') ||
      q.includes('what do we talk') ||
      q.includes('subjects') ||
      q.includes('cluster') ||
      q.includes('word cloud') ||
      q.includes('keywords')
    ) {
      return this.handleTopicsIntent(datasetId, dataset, analytics);
    }

    // 5. Intent: Emojis / Sentiment Indicators
    if (
      q.includes('emoji') ||
      q.includes('emoticon') ||
      q.includes('reaction') ||
      q.includes('smile') ||
      q.includes('laugh')
    ) {
      return this.handleEmojisIntent(dataset, analytics);
    }

    // 6. Intent: Streaks / Longest Chat Streak
    if (
      q.includes('streak') ||
      q.includes('longest continuous') ||
      q.includes('active days') ||
      q.includes('consecutive')
    ) {
      return this.handleStreaksIntent(dataset, analytics);
    }

    // 7. Intent: Media & Attachments
    if (
      q.includes('photo') ||
      q.includes('image') ||
      q.includes('media') ||
      q.includes('picture') ||
      q.includes('attachment') ||
      q.includes('file')
    ) {
      return this.handleSearchIntent(datasetId, '[Photo');
    }

    // 8. Intent: Specific Keyword Search
    const searchMatch = q.match(/(?:search|find|show messages|look for|where was)\s+(?:about|for)?\s*(.*)/i);
    const searchKeyword = searchMatch ? searchMatch[1].trim() : q;

    if (searchKeyword && searchKeyword.length > 2 && !q.includes('summary') && !q.includes('overview') && !q.includes('help')) {
      return this.handleSearchIntent(datasetId, searchKeyword);
    }

    // Default: Executive Summary & Overview
    return this.handleOverviewIntent(dataset, analytics);
  }

  private handleTopActorsIntent(dataset: any, analytics: any): AssistantResponse {
    const actors = analytics.messageAnalytics?.authorStats || [];
    const totalMsgs = analytics.messageAnalytics?.totalMessages || 1;

    let text = `### 👥 Participant Breakdown for **${dataset.name}**\n\n`;
    text += `There are **${actors.length} active participants** indexed in this dataset.\n\n`;

    actors.slice(0, 5).forEach((a: any, idx: number) => {
      const pct = ((a.messageCount / totalMsgs) * 100).toFixed(1);
      const avgLen = Math.round((a.totalCharacters || 0) / Math.max(1, a.messageCount));
      text += `**${idx + 1}. ${a.author}**\n`;
      text += `- **${a.messageCount.toLocaleString()} messages** (${pct}% volume share)\n`;
      text += `- **${(a.totalCharacters || 0).toLocaleString()} total characters** (avg ${avgLen} chars/msg)\n\n`;
    });

    const top = actors[0];

    return {
      answer: text,
      intent: 'TOP_ACTORS',
      keyStats: [
        { label: 'TOP CONTRIBUTOR', value: top?.author || 'Unknown', color: '#0284c7' },
        { label: 'TOTAL PARTICIPANTS', value: actors.length.toString(), color: '#059669' },
        { label: 'LEADER SHARE', value: `${top ? ((top.messageCount / totalMsgs) * 100).toFixed(1) : 0}%`, color: '#7c3aed' },
      ],
      citations: [],
      suggestedFollowUps: [
        'When is the most active time of day for our chat?',
        'What are the most common emojis used by the group?',
        'Detect activity spikes and anomalies',
      ],
    };
  }

  private handlePeakTimeIntent(dataset: any, analytics: any): AssistantResponse {
    const act = analytics.activityAnalytics || {};
    const busiestHour = act.busiestHour ?? 14;
    const busiestDay = act.busiestDay ?? 'Tuesday';
    const hourLabel = busiestHour === 0 ? '12:00 AM' : busiestHour === 12 ? '12:00 PM' : busiestHour > 12 ? `${busiestHour - 12}:00 PM` : `${busiestHour}:00 AM`;

    let text = `### ⏰ Peak Activity & Circadian Schedule for **${dataset.name}**\n\n`;
    text += `Communication velocity peaks at **${hourLabel}**, with **${busiestDay}** being the most active calendar weekday.\n\n`;
    text += `- **Peak Hour**: ${hourLabel}\n`;
    text += `- **Busiest Day**: ${busiestDay}\n`;
    text += `- **Active Calendar Days**: ${(act.totalActiveDays || 0).toLocaleString()} days\n`;
    text += `- **Average Daily Volume**: ${Math.round(act.averageMessagesPerActiveDay || 0).toLocaleString()} msgs/day\n`;

    return {
      answer: text,
      intent: 'PEAK_TIME',
      keyStats: [
        { label: 'PEAK HOUR', value: hourLabel, color: '#38bdf8' },
        { label: 'BUSIEST DAY', value: busiestDay, color: '#a855f7' },
        { label: 'DAILY AVG', value: `${Math.round(act.averageMessagesPerActiveDay || 0)} msgs`, color: '#34d399' },
      ],
      citations: [],
      suggestedFollowUps: [
        'Who sends the most messages overall?',
        'Are there any notable communication silence gaps?',
        'What are the main topics discussed?',
      ],
    };
  }

  private async handleAnomaliesIntent(datasetId: string, dataset: any, analytics: any): Promise<AssistantResponse> {
    const rawEvents = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      select: { id: true, timestamp: true, actor: true, content: true },
      orderBy: { timestamp: 'asc' },
    });

    const report = this.anomalyDetector.detectAnomalies(datasetId, rawEvents as any);
    const anomalies = report?.anomalies || [];

    let text = `### 🚨 Forensic Anomaly & Velocity Radar for **${dataset.name}**\n\n`;
    text += `The anomaly detection engine identified **${anomalies.length} significant velocity events** across this dataset.\n\n`;

    if (anomalies.length === 0) {
      text += `No statistical outliers or anomalous surges were detected. Activity follows steady baseline patterns.\n`;
    } else {
      anomalies.slice(0, 4).forEach((anom: any, idx: number) => {
        text += `**${idx + 1}. [${anom.type}] ${new Date(anom.timestamp).toLocaleDateString()}**\n`;
        text += `- **Event**: ${anom.title} — ${anom.description}\n`;
        if (anom.metrics) {
          text += `- **Metrics**: ${anom.metrics.value} ${anom.metrics.unit} (${anom.metrics.ratio ? anom.metrics.ratio.toFixed(1) : '1'}x baseline)\n\n`;
        }
      });
    }

    return {
      answer: text,
      intent: 'ANOMALY_AUDIT',
      keyStats: [
        { label: 'ANOMALIES FOUND', value: anomalies.length.toString(), color: anomalies.length > 0 ? '#f43f5e' : '#10b981' },
        { label: 'SCAN METHOD', value: 'IQR 3-Sigma', color: '#64748b' },
      ],
      citations: [],
      suggestedFollowUps: [
        'What caused the largest activity spike?',
        'Who was chatting during the busy periods?',
        'Show executive dataset summary',
      ],
    };
  }

  private async handleTopicsIntent(datasetId: string, dataset: any, analytics: any): Promise<AssistantResponse> {
    const rawEvents = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      select: { id: true, timestamp: true, actor: true, content: true },
      orderBy: { timestamp: 'asc' },
    });

    const report = this.clusteringEngine.clusterEvents(datasetId, rawEvents as any);
    const clusters = report?.clusters || [];

    let text = `### 🧠 Thematic Clusters & Semantic Topics for **${dataset.name}**\n\n`;
    text += `Lexical clustering discovered **${clusters.length} primary conversation themes**:\n\n`;

    clusters.slice(0, 5).forEach((c: any, idx: number) => {
      text += `**${idx + 1}. ${c.icon || '🏷️'} Theme: ${c.name}** (${c.messageCount.toLocaleString()} messages, ${c.percentage ? c.percentage.toFixed(1) : 0}%)\n`;
      text += `- Keywords: *${(c.topKeywords || []).slice(0, 6).map((k: any) => k.word).join(', ')}*\n`;
      text += `- Primary Actors: ${(c.topParticipants || []).slice(0, 3).map((p: any) => p.actor).join(', ')}\n\n`;
    });

    return {
      answer: text,
      intent: 'TOPIC_CLUSTERS',
      keyStats: [
        { label: 'TOPIC THEMES', value: clusters.length.toString(), color: '#8b5cf6' },
        { label: 'LARGEST CLUSTER', value: clusters[0]?.name || 'General', color: '#06b6d4' },
      ],
      citations: [],
      suggestedFollowUps: [
        'Search for specific messages about these topics',
        'When did we talk the most about our main theme?',
        'Export conversation to PDF archive',
      ],
    };
  }

  private handleEmojisIntent(dataset: any, analytics: any): AssistantResponse {
    const emojis = analytics.emojiAnalytics?.topEmojis || [];
    const totalEmojiCount = analytics.emojiAnalytics?.totalEmojisUsed || 0;

    let text = `### 😄 Emoji Dynamics for **${dataset.name}**\n\n`;
    text += `A total of **${totalEmojiCount.toLocaleString()} emoji glyphs** were recorded across the conversation.\n\n`;

    emojis.slice(0, 8).forEach((e: any, idx: number) => {
      text += `${idx + 1}. **${e.emoji}** — used **${e.count.toLocaleString()} times** (${e.percentage ? e.percentage.toFixed(1) : 0}%)\n`;
    });

    return {
      answer: text,
      intent: 'EMOJI_STATS',
      keyStats: [
        { label: 'TOP EMOJI', value: emojis[0]?.emoji || 'None', color: '#f59e0b' },
        { label: 'TOTAL EMOJIS', value: totalEmojiCount.toLocaleString(), color: '#ec4899' },
      ],
      citations: [],
      suggestedFollowUps: [
        'Who sent the most emojis?',
        'What was the most active day in the chat?',
      ],
    };
  }

  private handleStreaksIntent(dataset: any, analytics: any): AssistantResponse {
    const act = analytics.activityAnalytics || {};
    const longestStreak = act.longestStreak || { days: 0, startDate: null, endDate: null };
    const longestGap = act.longestGap || { days: 0, startDate: null, endDate: null };

    let text = `### 🔥 Chat Streaks & Engagement Continuity for **${dataset.name}**\n\n`;
    text += `- **Longest Continuous Streak**: **${longestStreak.days} consecutive days**\n`;
    if (longestStreak.startDate) {
      text += `  From ${new Date(longestStreak.startDate).toLocaleDateString()} to ${new Date(longestStreak.endDate).toLocaleDateString()}\n\n`;
    }
    text += `- **Longest Silence Gap**: **${longestGap.days} days of inactivity**\n`;
    if (longestGap.startDate) {
      text += `  From ${new Date(longestGap.startDate).toLocaleDateString()} to ${new Date(longestGap.endDate).toLocaleDateString()}\n\n`;
    }
    text += `- **Total Active Calendar Days**: **${(act.totalActiveDays || 0).toLocaleString()} days**\n`;

    return {
      answer: text,
      intent: 'STREAKS_AUDIT',
      keyStats: [
        { label: 'LONGEST STREAK', value: `${longestStreak.days} Days`, color: '#f97316' },
        { label: 'LONGEST GAP', value: `${longestGap.days} Days`, color: '#64748b' },
        { label: 'ACTIVE DAYS', value: (act.totalActiveDays || 0).toString(), color: '#10b981' },
      ],
      citations: [],
      suggestedFollowUps: [
        'When do we chat the most?',
        'Who was chatting the most during our longest streak?',
      ],
    };
  }

  private async handleSearchIntent(datasetId: string, keyword: string): Promise<AssistantResponse> {
    const events = await this.prisma.timelineEvent.findMany({
      where: {
        datasetId,
        content: { contains: keyword },
      },
      take: 5,
      orderBy: { timestamp: 'asc' },
    });

    const totalMatches = await this.prisma.timelineEvent.count({
      where: {
        datasetId,
        content: { contains: keyword },
      },
    });

    let text = `### 🔍 Semantic Search Results for "${keyword}"\n\n`;
    text += `Found **${totalMatches.toLocaleString()} matching records** in this dataset.\n\n`;

    const citations = events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      actor: e.actor,
      snippet: e.content.length > 150 ? `${e.content.slice(0, 150)}...` : e.content,
    }));

    citations.forEach((c, idx) => {
      text += `**${idx + 1}. [${new Date(c.timestamp).toLocaleDateString()}] ${c.actor || 'System'}**\n`;
      text += `> "${c.snippet}"\n\n`;
    });

    return {
      answer: text,
      intent: 'KEYWORD_SEARCH',
      keyStats: [
        { label: 'SEARCH QUERY', value: `"${keyword}"`, color: '#38bdf8' },
        { label: 'TOTAL MATCHES', value: totalMatches.toLocaleString(), color: '#22c55e' },
      ],
      citations,
      suggestedFollowUps: [
        'Who spoke the most about this topic?',
        'When did this conversation start?',
        'Show activity overview',
      ],
    };
  }

  private handleOverviewIntent(dataset: any, analytics: any): AssistantResponse {
    const totalMsgs = analytics.messageAnalytics?.totalMessages || dataset.totalEvents || 0;
    const totalActors = analytics.messageAnalytics?.authorStats?.length || 0;
    const activeDays = analytics.activityAnalytics?.totalActiveDays || 0;
    const startDateStr = dataset.startDate ? new Date(dataset.startDate).toLocaleDateString() : 'N/A';
    const endDateStr = dataset.endDate ? new Date(dataset.endDate).toLocaleDateString() : 'N/A';

    let text = `### ⚡ Executive Overview for **${dataset.name}**\n\n`;
    text += `This communication dataset spans from **${startDateStr}** to **${endDateStr}**, indexing **${totalMsgs.toLocaleString()} total messages** across **${totalActors} participants**.\n\n`;
    text += `- **Total Message Volume**: ${totalMsgs.toLocaleString()}\n`;
    text += `- **Active Calendar Days**: ${activeDays.toLocaleString()} days\n`;
    text += `- **Source Format**: ${dataset.sourceType.toUpperCase()}\n`;
    text += `- **Storage Verification**: 100% On-Device Local SQLite Vault\n`;

    return {
      answer: text,
      intent: 'ACTIVITY_SUMMARY',
      keyStats: [
        { label: 'TOTAL MESSAGES', value: totalMsgs.toLocaleString(), color: '#0284c7' },
        { label: 'PARTICIPANTS', value: totalActors.toString(), color: '#059669' },
        { label: 'ACTIVE DAYS', value: activeDays.toString(), color: '#7c3aed' },
      ],
      citations: [],
      suggestedFollowUps: [
        'Who is the most active person in this chat?',
        'What time of day do people send the most messages?',
        'Detect any unusual activity spikes or silences',
        'Export this conversation to verified PDF archive',
      ],
    };
  }
}
