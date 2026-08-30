import { Injectable, Logger } from '@nestjs/common';

export interface EmotionScore {
  joy: number;
  anger: number;
  fear: number;
  sadness: number;
  surprise: number;
  anticipation: number;
}

export interface EmotionProfile {
  scores: EmotionScore;
  dominantEmotion: keyof EmotionScore;
  overallValence: number; // -1.0 (negative) to +1.0 (positive)
  intensity: number; // 0.0 to 1.0
}

export interface ActorEmotionBreakdown {
  actor: string;
  totalMessages: number;
  profile: EmotionProfile;
}

export interface TimelineEmotionPoint {
  timestamp: string;
  dateKey: string;
  scores: EmotionScore;
  dominantEmotion: keyof EmotionScore;
}

@Injectable()
export class EmotionRadarService {
  private readonly logger = new Logger(EmotionRadarService.name);

  // Local lexicons for 6 basic emotional axes
  private readonly joyLexicon = new Set([
    'happy', 'great', 'awesome', 'excellent', 'love', 'congrats', 'congratulations',
    'win', 'celebrate', 'amazing', 'perfect', 'glad', 'wonderful', 'blessed',
    'excited', 'proud', 'yay', 'hooray', 'success', 'fantastic', 'super', 'thanks',
    'thank', 'grateful', 'delighted', 'cheers', 'enjoy', 'brilliant',
  ]);

  private readonly angerLexicon = new Set([
    'angry', 'furious', 'hate', 'annoyed', 'mad', 'rage', 'stupid', 'idiot',
    'worst', 'terrible', 'horrible', 'trash', 'garbage', 'screw', 'damn', 'hell',
    'ridiculous', 'unacceptable', 'disaster', 'fault', 'blame', 'fight', 'liar',
    'hostile', 'incompetent', 'frustrated', 'pissed', 'nonsense',
  ]);

  private readonly fearLexicon = new Set([
    'scared', 'afraid', 'fear', 'terrified', 'worry', 'worried', 'panic',
    'anxious', 'threat', 'danger', 'risk', 'warning', 'breach', 'leak',
    'alert', 'critical', 'fail', 'emergency', 'dread', 'vulnerable', 'caught',
    'exposed', 'trouble', 'nervous', 'urgent',
  ]);

  private readonly sadnessLexicon = new Set([
    'sad', 'depressed', 'cry', 'crying', 'sorry', 'regret', 'loss', 'grief',
    'unfortunate', 'hopeless', 'pain', 'hurt', 'miss', 'missing', 'disappointed',
    'unhappy', 'lonely', 'mourn', 'pity', 'tragic', 'heartbroken', 'down',
  ]);

  private readonly surpriseLexicon = new Set([
    'wow', 'omg', 'what', 'whoa', 'shocking', 'surprise', 'unbelievable',
    'unexpected', 'sudden', 'really', 'seriously', 'astonishing', 'insane',
    'crazy', 'never', 'miracle', 'revelation', 'unreal',
  ]);

  private readonly anticipationLexicon = new Set([
    'soon', 'next', 'plan', 'planning', 'ready', 'prepare', 'expect', 'waiting',
    'hope', 'future', 'schedule', 'target', 'deadline', 'upcoming', 'launch',
    'tomorrow', 'countdown', 'vision', 'goal', 'roadmap', 'forecast',
  ]);

  /**
   * Analyzes text content and returns normalized emotion scores (0.0 to 1.0 for each axis)
   */
  analyzeTextEmotion(text: string): EmotionProfile {
    if (!text) {
      return {
        scores: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, anticipation: 0 },
        dominantEmotion: 'joy',
        overallValence: 0,
        intensity: 0,
      };
    }

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    let joyCount = 0;
    let angerCount = 0;
    let fearCount = 0;
    let sadnessCount = 0;
    let surpriseCount = 0;
    let anticipationCount = 0;

    for (const w of words) {
      if (this.joyLexicon.has(w)) joyCount++;
      if (this.angerLexicon.has(w)) angerCount++;
      if (this.fearLexicon.has(w)) fearCount++;
      if (this.sadnessLexicon.has(w)) sadnessCount++;
      if (this.surpriseLexicon.has(w)) surpriseCount++;
      if (this.anticipationLexicon.has(w)) anticipationCount++;
    }

    // Emoji emotion boosts
    if (/🎉|🥳|❤️|😍|🚀|🔥|✨|👏|🙌|😁|😊/.test(text)) joyCount += 2;
    if (/😡|🤬|👿|💢|🖕/.test(text)) angerCount += 2;
    if (/😨|😰|😱|🚨|⚠️|☠️/.test(text)) fearCount += 2;
    if (/😢|😭|💔|😞|😔/.test(text)) sadnessCount += 2;
    if (/😲|🤯|😮|⚡|👀/.test(text)) surpriseCount += 2;
    if (/⏳|⏱️|🎯|📅|📈/.test(text)) anticipationCount += 2;

    const totalEmotions = joyCount + angerCount + fearCount + sadnessCount + surpriseCount + anticipationCount;

    const scores: EmotionScore = {
      joy: totalEmotions ? parseFloat((joyCount / totalEmotions).toFixed(3)) : 0,
      anger: totalEmotions ? parseFloat((angerCount / totalEmotions).toFixed(3)) : 0,
      fear: totalEmotions ? parseFloat((fearCount / totalEmotions).toFixed(3)) : 0,
      sadness: totalEmotions ? parseFloat((sadnessCount / totalEmotions).toFixed(3)) : 0,
      surprise: totalEmotions ? parseFloat((surpriseCount / totalEmotions).toFixed(3)) : 0,
      anticipation: totalEmotions ? parseFloat((anticipationCount / totalEmotions).toFixed(3)) : 0,
    };

    let maxVal = -1;
    let dominant: keyof EmotionScore = 'joy';
    for (const [key, val] of Object.entries(scores) as [keyof EmotionScore, number][]) {
      if (val > maxVal) {
        maxVal = val;
        dominant = key;
      }
    }

    const positiveMass = scores.joy + scores.anticipation * 0.5;
    const negativeMass = scores.anger + scores.fear + scores.sadness;
    const overallValence = parseFloat((positiveMass - negativeMass).toFixed(2));
    const intensity = Math.min(1, parseFloat((totalEmotions / Math.max(1, words.length * 0.4)).toFixed(2)));

    return {
      scores,
      dominantEmotion: totalEmotions ? dominant : 'joy',
      overallValence,
      intensity,
    };
  }

  /**
   * Aggregates emotional valence across all participants and chronological timeline bins
   */
  aggregateDatasetEmotions(
    events: Array<{ actor: string | null; content: string; timestamp: Date }>,
  ): {
    overallProfile: EmotionProfile;
    actorBreakdown: ActorEmotionBreakdown[];
    timelineTrajectory: TimelineEmotionPoint[];
  } {
    const actorMap = new Map<string, { joy: number; anger: number; fear: number; sadness: number; surprise: number; anticipation: number; count: number }>();
    const timelineMap = new Map<string, { joy: number; anger: number; fear: number; sadness: number; surprise: number; anticipation: number; count: number }>();

    let totalJoy = 0;
    let totalAnger = 0;
    let totalFear = 0;
    let totalSadness = 0;
    let totalSurprise = 0;
    let totalAnticipation = 0;

    for (const ev of events) {
      const profile = this.analyzeTextEmotion(ev.content);
      const actor = ev.actor || 'Unknown';
      const dateKey = ev.timestamp.toISOString().split('T')[0];

      totalJoy += profile.scores.joy;
      totalAnger += profile.scores.anger;
      totalFear += profile.scores.fear;
      totalSadness += profile.scores.sadness;
      totalSurprise += profile.scores.surprise;
      totalAnticipation += profile.scores.anticipation;

      // Actor aggregation
      if (!actorMap.has(actor)) {
        actorMap.set(actor, { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, anticipation: 0, count: 0 });
      }
      const a = actorMap.get(actor)!;
      a.joy += profile.scores.joy;
      a.anger += profile.scores.anger;
      a.fear += profile.scores.fear;
      a.sadness += profile.scores.sadness;
      a.surprise += profile.scores.surprise;
      a.anticipation += profile.scores.anticipation;
      a.count++;

      // Timeline aggregation
      if (!timelineMap.has(dateKey)) {
        timelineMap.set(dateKey, { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, anticipation: 0, count: 0 });
      }
      const t = timelineMap.get(dateKey)!;
      t.joy += profile.scores.joy;
      t.anger += profile.scores.anger;
      t.fear += profile.scores.fear;
      t.sadness += profile.scores.sadness;
      t.surprise += profile.scores.surprise;
      t.anticipation += profile.scores.anticipation;
      t.count++;
    }

    const n = Math.max(1, events.length);
    const overallScores: EmotionScore = {
      joy: parseFloat((totalJoy / n).toFixed(3)),
      anger: parseFloat((totalAnger / n).toFixed(3)),
      fear: parseFloat((totalFear / n).toFixed(3)),
      sadness: parseFloat((totalSadness / n).toFixed(3)),
      surprise: parseFloat((totalSurprise / n).toFixed(3)),
      anticipation: parseFloat((totalAnticipation / n).toFixed(3)),
    };

    let maxVal = -1;
    let dominant: keyof EmotionScore = 'joy';
    for (const [key, val] of Object.entries(overallScores) as [keyof EmotionScore, number][]) {
      if (val > maxVal) {
        maxVal = val;
        dominant = key;
      }
    }

    const actorBreakdown: ActorEmotionBreakdown[] = Array.from(actorMap.entries()).map(([actor, data]) => {
      const c = Math.max(1, data.count);
      const scores: EmotionScore = {
        joy: parseFloat((data.joy / c).toFixed(3)),
        anger: parseFloat((data.anger / c).toFixed(3)),
        fear: parseFloat((data.fear / c).toFixed(3)),
        sadness: parseFloat((data.sadness / c).toFixed(3)),
        surprise: parseFloat((data.surprise / c).toFixed(3)),
        anticipation: parseFloat((data.anticipation / c).toFixed(3)),
      };
      let dom: keyof EmotionScore = 'joy';
      let mx = -1;
      for (const [k, v] of Object.entries(scores) as [keyof EmotionScore, number][]) {
        if (v > mx) {
          mx = v;
          dom = k;
        }
      }
      return {
        actor,
        totalMessages: data.count,
        profile: {
          scores,
          dominantEmotion: dom,
          overallValence: parseFloat((scores.joy - (scores.anger + scores.sadness)).toFixed(2)),
          intensity: parseFloat((mx).toFixed(2)),
        },
      };
    });

    const timelineTrajectory: TimelineEmotionPoint[] = Array.from(timelineMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, data]) => {
        const c = Math.max(1, data.count);
        const scores: EmotionScore = {
          joy: parseFloat((data.joy / c).toFixed(3)),
          anger: parseFloat((data.anger / c).toFixed(3)),
          fear: parseFloat((data.fear / c).toFixed(3)),
          sadness: parseFloat((data.sadness / c).toFixed(3)),
          surprise: parseFloat((data.surprise / c).toFixed(3)),
          anticipation: parseFloat((data.anticipation / c).toFixed(3)),
        };
        let dom: keyof EmotionScore = 'joy';
        let mx = -1;
        for (const [k, v] of Object.entries(scores) as [keyof EmotionScore, number][]) {
          if (v > mx) {
            mx = v;
            dom = k;
          }
        }
        return {
          timestamp: `${dateKey}T00:00:00.000Z`,
          dateKey,
          scores,
          dominantEmotion: dom,
        };
      });

    return {
      overallProfile: {
        scores: overallScores,
        dominantEmotion: dominant,
        overallValence: parseFloat((overallScores.joy - (overallScores.anger + overallScores.sadness)).toFixed(2)),
        intensity: parseFloat((maxVal).toFixed(2)),
      },
      actorBreakdown,
      timelineTrajectory,
    };
  }
}
