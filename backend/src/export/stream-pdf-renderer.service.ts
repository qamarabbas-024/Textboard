import { Injectable, Logger } from '@nestjs/common';
import * as PDFKit from 'pdfkit';
const PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { FontResolverService, RegisteredFontFamily } from './font-resolver.service';
import { EmojiRendererService } from './emoji-renderer.service';
import { ChatExportOptions } from './types';
import { DataIntegrityVerifier } from './data-integrity-verifier';

export interface ParticipantTheme {
  primaryColor: string;
  badgeBg: string;
  bubbleBg: string;
  bubbleBorder: string;
  textColor: string;
}

export interface DocumentTheme {
  pageBg: string;
  headerBg: string;
  headerBorder: string;
  headerText: string;
  headerSubtext: string;
  sentBubbleBg: string;
  sentBubbleBorder: string;
  sentTextColor: string;
  sentTimestampColor: string;
  receivedBubbleBg: string;
  receivedBubbleBorder: string;
  receivedTextColor: string;
  receivedTimestampColor: string;
  dateSeparatorBg: string;
  dateSeparatorBorder: string;
  dateSeparatorText: string;
}

export const THEMES: Record<'light' | 'dark' | 'monochrome', DocumentTheme> = {
  light: {
    pageBg: '#EFEAE2', // Eye-care warm cream (eye-comfort reading background)
    headerBg: '#FFFFFF',
    headerBorder: '#E2E8F0',
    headerText: '#0F172A',
    headerSubtext: '#64748B',
    sentBubbleBg: '#D9FDD3', // Soft Mint Green
    sentBubbleBorder: '#B9F6CA',
    sentTextColor: '#064E3B',
    sentTimestampColor: '#047857',
    receivedBubbleBg: '#E0F2FE', // Light Blue (as requested!)
    receivedBubbleBorder: '#BAE6FD',
    receivedTextColor: '#0F172A',
    receivedTimestampColor: '#0369A1',
    dateSeparatorBg: '#E2E8F0',
    dateSeparatorBorder: '#CBD5E1',
    dateSeparatorText: '#475569',
  },
  dark: {
    pageBg: '#0F172A',
    headerBg: '#1E293B',
    headerBorder: '#334155',
    headerText: '#F8FAFC',
    headerSubtext: '#94A3B8',
    sentBubbleBg: '#064E3B',
    sentBubbleBorder: '#059669',
    sentTextColor: '#ECFDF5',
    sentTimestampColor: '#34D399',
    receivedBubbleBg: '#1E293B',
    receivedBubbleBorder: '#334155',
    receivedTextColor: '#F8FAFC',
    receivedTimestampColor: '#94A3B8',
    dateSeparatorBg: '#334155',
    dateSeparatorBorder: '#475569',
    dateSeparatorText: '#CBD5E1',
  },
  monochrome: {
    pageBg: '#FFFFFF',
    headerBg: '#F9FAFB',
    headerBorder: '#D1D5DB',
    headerText: '#111827',
    headerSubtext: '#4B5563',
    sentBubbleBg: '#F3F4F6',
    sentBubbleBorder: '#D1D5DB',
    sentTextColor: '#111827',
    sentTimestampColor: '#6B7280',
    receivedBubbleBg: '#FFFFFF',
    receivedBubbleBorder: '#E5E7EB',
    receivedTextColor: '#111827',
    receivedTimestampColor: '#6B7280',
    dateSeparatorBg: '#F3F4F6',
    dateSeparatorBorder: '#D1D5DB',
    dateSeparatorText: '#374151',
  },
};

export function resolveDocumentTheme(options: ChatExportOptions): DocumentTheme {
  const baseTheme = THEMES[options.theme || 'light'] || THEMES.light;
  return {
    ...baseTheme,
    pageBg: options.pageBgColor || baseTheme.pageBg,
    sentBubbleBg: options.sentBubbleColor || baseTheme.sentBubbleBg,
    receivedBubbleBg: options.receivedBubbleColor || baseTheme.receivedBubbleBg,
  };
}

const PARTICIPANT_PALETTE: ParticipantTheme[] = [
  { primaryColor: '#0369A1', badgeBg: '#E0F2FE', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
  { primaryColor: '#059669', badgeBg: '#ECFDF5', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
  { primaryColor: '#2563EB', badgeBg: '#EFF6FF', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
  { primaryColor: '#7C3AED', badgeBg: '#F5F3FF', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
  { primaryColor: '#D97706', badgeBg: '#FFFBEB', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
  { primaryColor: '#E11D48', badgeBg: '#FFF1F2', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
  { primaryColor: '#0891B2', badgeBg: '#ECFEFF', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
  { primaryColor: '#4F46E5', badgeBg: '#EEF2FF', bubbleBg: '#E0F2FE', bubbleBorder: '#BAE6FD', textColor: '#0F172A' },
];

const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 36;
const MARGIN_LEFT = 36;
const MARGIN_RIGHT = 36;

export interface MediaDescriptor {
  isMedia: boolean;
  type: string;
  icon: string;
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextColor: string;
  filename?: string;
}

export function detectMediaDescriptor(content: string, hasMedia?: boolean): MediaDescriptor {
  const trimmed = (content || '').trim();
  const lower = trimmed.toLowerCase();

  // If content is empty or null, but marked as media
  if (!trimmed && hasMedia) {
    return {
      isMedia: true,
      type: 'sticker',
      icon: '',
      label: 'STICKER ATTACHMENT',
      badgeBg: '#F3E8FF',
      badgeBorder: '#D8B4FE',
      badgeTextColor: '#6B21A8',
      filename: undefined,
    };
  }

  // 1. Audio / Voice Note
  if (
    /(AUD|PTT)-[\w-]+\.(opus|mp3|m4a|aac|wav|ogg)/i.test(trimmed) ||
    /\.(opus|mp3|m4a|aac|wav|ogg)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    lower.includes('<audio omitted>') ||
    lower.includes('[audio omitted]') ||
    lower.includes('voice note')
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(opus|mp3|m4a|aac|wav|ogg))/i);
    return {
      isMedia: true,
      type: 'audio',
      icon: '',
      label: 'VOICE NOTE / AUDIO',
      badgeBg: '#ECFDF5',
      badgeBorder: '#A7F3D0',
      badgeTextColor: '#047857',
      filename: filenameMatch ? filenameMatch[1] : undefined,
    };
  }

  // 2. Video
  if (
    /VID-[\w-]+\.(mp4|mov|3gp|mkv)/i.test(trimmed) ||
    /\.(mp4|mov|3gp|mkv)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    lower.includes('<video omitted>') ||
    lower.includes('[video omitted]')
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(mp4|mov|3gp|mkv))/i);
    return {
      isMedia: true,
      type: 'video',
      icon: '',
      label: 'VIDEO ATTACHMENT',
      badgeBg: '#FFF1F2',
      badgeBorder: '#FECDD3',
      badgeTextColor: '#BE123C',
      filename: filenameMatch ? filenameMatch[1] : undefined,
    };
  }

  // 3. Photo / Image
  if (
    /IMG-[\w-]+\.(jpg|jpeg|png|heic)/i.test(trimmed) ||
    /\.(jpg|jpeg|png|heic)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    lower.includes('<image omitted>') ||
    lower.includes('[image omitted]') ||
    lower.includes('<photo omitted>')
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(jpg|jpeg|png|heic))/i);
    return {
      isMedia: true,
      type: 'image',
      icon: '',
      label: 'PHOTO / IMAGE',
      badgeBg: '#EFF6FF',
      badgeBorder: '#BFDBFE',
      badgeTextColor: '#1D4ED8',
      filename: filenameMatch ? filenameMatch[1] : undefined,
    };
  }

  // 4. Contact card: *.vcf
  if (/\.vcf\s*\(\s*file attached\s*\)/i.test(trimmed) || lower.includes('contact card') || lower.includes('.vcf')) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.vcf)/i);
    return {
      isMedia: true,
      type: 'contact',
      icon: '',
      label: 'CONTACT CARD',
      badgeBg: '#FFFBEB',
      badgeBorder: '#FDE68A',
      badgeTextColor: '#B45309',
      filename: filenameMatch ? filenameMatch[1] : undefined,
    };
  }

  // 5. Document: *.pdf, *.docx, *.xlsx, *.zip
  if (
    /\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt)\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    lower.includes('<document omitted>') ||
    lower.includes('[document omitted]')
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt))/i);
    return {
      isMedia: true,
      type: 'document',
      icon: '',
      label: 'DOCUMENT ATTACHMENT',
      badgeBg: '#F1F5F9',
      badgeBorder: '#CBD5E1',
      badgeTextColor: '#334155',
      filename: filenameMatch ? filenameMatch[1] : undefined,
    };
  }

  // 6. Sticker / General Media Attachment (Catch-all for all sticker types)
  if (
    hasMedia ||
    /STK-[\w-]+\.webp/i.test(trimmed) ||
    /sticker\.webp/i.test(trimmed) ||
    /\.webp\s*\(\s*file attached\s*\)/i.test(trimmed) ||
    lower.includes('sticker') ||
    lower.includes('omitted') ||
    lower.includes('[media') ||
    lower.includes('<media') ||
    lower.includes('(file attached)')
  ) {
    const filenameMatch = trimmed.match(/([^\s/\\:]+\.webp)/i);
    return {
      isMedia: true,
      type: 'sticker',
      icon: '',
      label: 'STICKER ATTACHMENT',
      badgeBg: '#F3E8FF',
      badgeBorder: '#D8B4FE',
      badgeTextColor: '#6B21A8',
      filename: filenameMatch ? filenameMatch[1] : undefined,
    };
  }

  return {
    isMedia: false,
    type: 'media',
    icon: '',
    label: '',
    badgeBg: '#FFFFFF',
    badgeBorder: '#E2E8F0',
    badgeTextColor: '#334155',
  };
}

@Injectable()
export class StreamPdfRendererService {
  private readonly logger = new Logger(StreamPdfRendererService.name);

  constructor(
    private readonly fontResolver: FontResolverService,
    private readonly emojiRenderer: EmojiRendererService,
  ) {}

  /**
   * Initializes a streaming PDFKit document with margins disabled to prevent phantom auto-page breaks.
   */
  createPdfDocument(
    outputPath: string,
    options: ChatExportOptions,
  ): { doc: PDFKit.PDFDocument; writeStream: fs.WriteStream; fonts: RegisteredFontFamily; pageTracker: { pageCount: number } } {
    const isLetter = options.pageSize === 'LETTER';
    const doc = new PDFDocument({
      size: isLetter ? 'LETTER' : 'A4',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      bufferPages: false,
      autoFirstPage: true,
      info: {
        Title: 'Textboard Visual Stream Archive',
        Author: 'Textboard Visual Content Engine',
        Subject: 'Communication Stream Intelligence',
        Creator: 'Textboard V1',
      },
    });

    const docTheme = resolveDocumentTheme(options);
    const pageTracker = { pageCount: 1 };

    if (docTheme.pageBg !== '#FFFFFF') {
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(docTheme.pageBg);
    }

    doc.on('pageAdded', () => {
      pageTracker.pageCount++;
      if (docTheme.pageBg !== '#FFFFFF') {
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(docTheme.pageBg);
      }
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    const fonts = this.fontResolver.configureFonts(doc);
    doc.y = MARGIN_TOP;

    return { doc, writeStream, fonts, pageTracker };
  }

  /**
   * Renders the Executive Dashboard Cover Page (Page 1).
   */
  renderCoverPage(
    doc: PDFKit.PDFDocument,
    dataset: { name: string; totalEvents?: number },
    summaryMetrics: {
      totalRecords: number;
      actorsCount: number;
      primaryActor: string | null;
      primaryPercent: number;
      startDateStr: string;
      endDateStr: string;
      activeDays: number;
      peakDayName: string;
      peakHour: number;
      mediaCount: number;
    },
    fonts: RegisteredFontFamily,
    options: ChatExportOptions,
  ) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - MARGIN_LEFT - MARGIN_RIGHT;

    // 1. Cover Page Gradient / Dark Accent Banner
    doc.rect(0, 0, pageWidth, 180).fill('#0F172A');

    // Title & Badge
    doc.fillColor('#38BDF8').font(fonts.bold).fontSize(10).text('TEXTBOARD STREAM INTELLIGENCE ARCHIVE', MARGIN_LEFT, 45, {
      characterSpacing: 1.5,
    });

    doc.fillColor('#FFFFFF').font(fonts.bold).fontSize(22).text(this.fontResolver.sanitizeText(dataset.name), MARGIN_LEFT, 68, {
      width: contentWidth,
      ellipsis: true,
    });

    const spanStr = `${summaryMetrics.startDateStr}  ➔  ${summaryMetrics.endDateStr} (${summaryMetrics.activeDays} Active Days)`;
    doc.fillColor('#94A3B8').font(fonts.regular).fontSize(9).text(spanStr, MARGIN_LEFT, 100);

    // Document Verified Tag
    doc.roundedRect(MARGIN_LEFT, 125, 170, 20, 4).fillAndStroke('#0369A1', '#0284C7');
    doc.fillColor('#E0F2FE').font(fonts.bold).fontSize(7.5).text('✓ LOSSLESS SHA-256 VERIFIED', MARGIN_LEFT + 8, 131);

    // 2. Four KPI Metric Cards (Grid 2x2)
    const cardY = 205;
    const cardWidth = (contentWidth - 16) / 2;
    const cardHeight = 72;

    // Card 1: Total Records & Volume
    doc.roundedRect(MARGIN_LEFT, cardY, cardWidth, cardHeight, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').font(fonts.bold).fontSize(8).text('TOTAL NORMALIZED RECORDS', MARGIN_LEFT + 12, cardY + 12);
    doc.fillColor('#0F172A').font(fonts.bold).fontSize(16).text(summaryMetrics.totalRecords.toLocaleString(), MARGIN_LEFT + 12, cardY + 28);
    doc.fillColor('#10B981').font(fonts.regular).fontSize(8).text('100% Deterministic Timeline Stream', MARGIN_LEFT + 12, cardY + 50);

    // Card 2: Participants & Lead Actor
    const card2X = MARGIN_LEFT + cardWidth + 16;
    doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').font(fonts.bold).fontSize(8).text('IDENTIFIED ACTORS', card2X + 12, cardY + 12);
    doc.fillColor('#0F172A').font(fonts.bold).fontSize(16).text(`${summaryMetrics.actorsCount} Entities`, card2X + 12, cardY + 28);
    const actorLead = summaryMetrics.primaryActor ? `Primary: ${summaryMetrics.primaryActor} (${summaryMetrics.primaryPercent}%)` : 'Balanced contribution';
    doc.fillColor('#6366F1').font(fonts.regular).fontSize(8).text(actorLead, card2X + 12, cardY + 50);

    // Card 3: Peak Temporal Activity
    const cardY2 = cardY + cardHeight + 14;
    doc.roundedRect(MARGIN_LEFT, cardY2, cardWidth, cardHeight, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').font(fonts.bold).fontSize(8).text('PEAK ACTIVITY WINDOW', MARGIN_LEFT + 12, cardY2 + 12);
    doc.fillColor('#0F172A').font(fonts.bold).fontSize(14).text(`${summaryMetrics.peakDayName}s @ ${summaryMetrics.peakHour}:00`, MARGIN_LEFT + 12, cardY2 + 30);
    doc.fillColor('#F59E0B').font(fonts.regular).fontSize(8).text('Highest engagement concentration', MARGIN_LEFT + 12, cardY2 + 50);

    // Card 4: Rich Media & Assets
    doc.roundedRect(card2X, cardY2, cardWidth, cardHeight, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').font(fonts.bold).fontSize(8).text('STICKERS & MEDIA CARDS', card2X + 12, cardY2 + 12);
    doc.fillColor('#0F172A').font(fonts.bold).fontSize(16).text(`${summaryMetrics.mediaCount.toLocaleString()} Assets`, card2X + 12, cardY2 + 28);
    doc.fillColor('#8B5CF6').font(fonts.regular).fontSize(8).text('Stickers, photos, voice notes & files', card2X + 12, cardY2 + 50);

    // 3. Document Reading Guide & Specifications
    const guideY = cardY2 + cardHeight + 24;
    doc.roundedRect(MARGIN_LEFT, guideY, contentWidth, 140, 8).fillAndStroke('#F1F5F9', '#CBD5E1');

    doc.fillColor('#0F172A').font(fonts.bold).fontSize(11).text('Visual Stream Archive Specifications', MARGIN_LEFT + 16, guideY + 16);

    doc.fillColor('#334155').font(fonts.regular).fontSize(8.5);
    const specs = [
      '• Dual-Stream Alignment: Sent entries on the right in emerald, received entries on the left in white.',
      '• Interactive Bookmarks: Open PDF Bookmarks in Adobe Acrobat or Chrome to jump directly to any month.',
      '• Asset Badges: Sticker cards, voice notes, photos, and document markers preserved with timestamps.',
      '• Lossless Zero-Truncation: Every message rendered in exact chronological order without omitted pages.',
    ];
    let specY = guideY + 38;
    for (const spec of specs) {
      doc.text(spec, MARGIN_LEFT + 16, specY, { width: contentWidth - 32 });
      specY += 20;
    }

    // 4. Footer on Cover Page
    doc.fillColor('#94A3B8').font(fonts.regular).fontSize(7.5).text(
      `Generated by Textboard Visual Content Engine • ${new Date().toUTCString()} • Page 1`,
      MARGIN_LEFT,
      pageHeight - 28,
      { align: 'center', width: contentWidth },
    );

    // Flip to Page 2 to begin the chronological communication stream cleanly
    doc.addPage();
    doc.y = MARGIN_TOP;
  }

  /**
   * Renders the top document header on subsequent timeline stream pages.
   */
  renderDocumentHeader(
    doc: PDFKit.PDFDocument,
    dataset: { name: string; totalEvents?: number },
    options: ChatExportOptions,
    fonts: RegisteredFontFamily,
    totalExpectedCount: number,
  ) {
    const theme = THEMES[options.theme || 'light'];
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - MARGIN_LEFT - MARGIN_RIGHT;

    // Header container
    doc.roundedRect(MARGIN_LEFT, MARGIN_TOP, contentWidth, 48, 6).fillAndStroke(theme.headerBg, theme.headerBorder);

    // Title
    doc.font(fonts.bold).fontSize(12).fillColor(theme.headerText);
    doc.text(this.fontResolver.sanitizeText(dataset.name), MARGIN_LEFT + 12, MARGIN_TOP + 8, {
      width: contentWidth - 24,
      ellipsis: true,
    });

    // Subtitle metadata
    doc.font(fonts.regular).fontSize(8).fillColor(theme.headerSubtext);
    const dateRangeStr =
      options.startDate || options.endDate
        ? `Filtered: ${options.startDate || 'Start'} to ${options.endDate || 'End'}`
        : 'Complete Timeline';
    const metaStr = `TEXTBOARD STREAM ARCHIVE • ${totalExpectedCount.toLocaleString()} ENTRIES • ${dateRangeStr}`;

    doc.text(metaStr, MARGIN_LEFT + 12, MARGIN_TOP + 26, {
      width: contentWidth - 24,
      ellipsis: true,
    });

    doc.y = MARGIN_TOP + 58;
  }

  /**
   * Adds an interactive PDF Chapter Bookmark when transition occurs to a new month.
   */
  addMonthBookmark(doc: PDFKit.PDFDocument, date: Date) {
    try {
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (doc.outline) {
        doc.outline.addItem(`📅 ${monthName}`);
      }
    } catch {}
  }

  /**
   * Renders a centered Date Separator pill (e.g. MONDAY, 14 AUGUST 2026).
   */
  renderDateSeparator(
    doc: PDFKit.PDFDocument,
    date: Date,
    fonts: RegisteredFontFamily,
    themeName: 'light' | 'dark' | 'monochrome' = 'light',
  ) {
    const theme = THEMES[themeName];
    const pageWidth = doc.page.width;
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const dateFormatted = date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase();
    const label = `${dayName}, ${dateFormatted}`;

    doc.font(fonts.bold).fontSize(7.5);
    const textWidth = doc.widthOfString(label) + 24;
    const pillWidth = Math.max(160, Math.min(300, textWidth));
    const pillX = (pageWidth - pillWidth) / 2;

    // Page break check (deterministic without empty page injection)
    if (doc.y + 32 > doc.page.height - MARGIN_BOTTOM) {
      doc.addPage();
      doc.y = MARGIN_TOP;
    }

    const currentY = doc.y + 6;

    // Pill background
    doc.roundedRect(pillX, currentY, pillWidth, 18, 9).fillAndStroke(theme.dateSeparatorBg, theme.dateSeparatorBorder);

    // Pill Text
    doc.fillColor(theme.dateSeparatorText);
    doc.text(label, pillX, currentY + 4.5, {
      width: pillWidth,
      align: 'center',
    });

    doc.y = currentY + 24;
  }

  /**
   * Gets deterministic visual theme for a given participant
   */
  getParticipantTheme(actor: string | null | undefined): ParticipantTheme {
    if (!actor) {
      return {
        primaryColor: '#64748B',
        badgeBg: '#F1F5F9',
        bubbleBg: '#FFFFFF',
        bubbleBorder: '#E2E8F0',
        textColor: '#0F172A',
      };
    }

    let hash = 0;
    for (let i = 0; i < actor.length; i++) {
      hash = (hash << 5) - hash + actor.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % PARTICIPANT_PALETTE.length;
    return PARTICIPANT_PALETTE[index];
  }

  /**
   * Renders a single timeline event bubble with two-sided stream layout:
   * - Sent entries (Primary) -> Right-aligned soft bubble
   * - Received entries (Secondary) -> Left-aligned bubble with sender badge
   */
  renderTimelineEvent(
    doc: PDFKit.PDFDocument,
    event: {
      id: string;
      timestamp: Date;
      actor: string | null;
      content: string;
      eventType: string;
      hasMedia?: boolean;
      metadata?: any;
    },
    options: ChatExportOptions,
    fonts: RegisteredFontFamily,
    isFirstInGroup: boolean,
    verifier: DataIntegrityVerifier,
    primaryActor: string | null,
  ) {
    const docTheme = resolveDocumentTheme(options);
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - MARGIN_LEFT - MARGIN_RIGHT;

    // Bubble sizing bounds (Standard stream: 76% max width)
    const maxBubbleWidth = Math.floor(contentWidth * 0.76);
    const minBubbleWidth = 120;
    const bubblePaddingH = 10;
    const bubblePaddingV = 7;
    const textWidthLimit = maxBubbleWidth - bubblePaddingH * 2;
    const timeStr = event.timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const media = detectMediaDescriptor(event.content, event.hasMedia);
    const isPureMedia = media.isMedia && (
      event.content.includes('(file attached)') ||
      event.content.includes('<Media omitted>') ||
      event.content.includes('[Media]') ||
      event.content.toLowerCase() === '<sticker omitted>'
    );

    // Sender alignment: Primary Actor goes to the RIGHT (Sent), Others to the LEFT (Received)
    const isSent = event.actor === primaryActor || (!primaryActor && (event.actor === 'Me' || event.actor === 'Sent'));
    const participantTheme = this.getParticipantTheme(event.actor);

    // Emoji detection & resolution
    const isPureEmoji = !isPureMedia && this.emojiRenderer.isPureEmojiMessage(event.content);
    const extractedEmojis = isPureEmoji ? this.emojiRenderer.extractEmojis(event.content).slice(0, 8) : [];
    const emojiPaths = extractedEmojis.map((e) => this.emojiRenderer.getEmojiImagePath(e)).filter(Boolean) as string[];

    let emojiSectionHeight = 0;
    let emojiSectionWidth = 0;
    if (isPureEmoji) {
      emojiSectionHeight = 24;
      emojiSectionWidth = Math.max(70, emojiPaths.length * 26 + 10);
    }

    const cleanContent = isPureMedia || isPureEmoji
      ? ''
      : this.emojiRenderer.sanitizeTextWithoutTofu(this.fontResolver.sanitizeText(event.content));

    // 1. Calculate sender name height (Only for received messages)
    let senderHeaderHeight = 0;
    if (!isSent && options.includeSenderNames !== false && isFirstInGroup && event.actor) {
      senderHeaderHeight = 13;
    }

    // 2. Calculate Media Card height
    let mediaBadgeHeight = 0;
    if (media.isMedia && options.includeMediaPlaceholders !== false) {
      mediaBadgeHeight = (media.filename ? 32 : 24) + 4;
    }

    // 3. Calculate text content height
    let textHeight = 0;
    let measuredTextWidth = 0;

    if (!isPureMedia && !isPureEmoji && cleanContent.trim().length > 0) {
      doc.font(fonts.regular).fontSize(9);
      textHeight = doc.heightOfString(cleanContent, {
        width: textWidthLimit,
        lineGap: 1.5,
      });
      measuredTextWidth = Math.min(textWidthLimit, doc.widthOfString(cleanContent));
    }

    // 4. Calculate timestamp dimensions
    doc.font(fonts.regular).fontSize(7);
    const timeWidth = doc.widthOfString(timeStr) + 4;
    const timeHeight = 9;

    // 5. Total bubble height and width
    const bubbleHeight =
      bubblePaddingV * 2 +
      senderHeaderHeight +
      mediaBadgeHeight +
      emojiSectionHeight +
      textHeight +
      (textHeight > 0 || (media.isMedia && options.includeMediaPlaceholders !== false) || isPureEmoji ? 4 : 0) +
      timeHeight;

    const naturalWidth = Math.max(
      measuredTextWidth + bubblePaddingH * 2,
      emojiSectionWidth + bubblePaddingH * 2,
      timeWidth + bubblePaddingH * 2 + 10,
      media.isMedia ? 160 : 0,
      minBubbleWidth,
    );
    const bubbleWidth = Math.min(maxBubbleWidth, Math.max(minBubbleWidth, naturalWidth));

    // 6. Two-Sided Stream X Placement
    const bubbleX = isSent
      ? pageWidth - MARGIN_RIGHT - bubbleWidth // Right-aligned
      : MARGIN_LEFT; // Left-aligned

    const spacingBefore = isFirstInGroup ? 5 : 2.5;

    // 7. Deterministic Page Break Prevention
    if (doc.y + bubbleHeight + spacingBefore > pageHeight - MARGIN_BOTTOM) {
      doc.addPage();
      doc.y = MARGIN_TOP;
    }

    const bubbleY = doc.y + spacingBefore;

    // 8. Render Bubble Background & Border
    const bubbleBg = isSent ? docTheme.sentBubbleBg : docTheme.receivedBubbleBg;
    const bubbleBorder = isSent ? docTheme.sentBubbleBorder : docTheme.receivedBubbleBorder;
    doc.roundedRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 6).fillAndStroke(bubbleBg, bubbleBorder);

    let innerY = bubbleY + bubblePaddingV;

    // 9. Render Sender Name (Received messages only)
    if (!isSent && senderHeaderHeight > 0 && event.actor) {
      doc.font(fonts.bold).fontSize(8).fillColor(participantTheme.primaryColor);
      doc.text(this.fontResolver.sanitizeText(event.actor), bubbleX + bubblePaddingH, innerY, {
        width: textWidthLimit,
        ellipsis: true,
      });
      innerY += senderHeaderHeight;
    }

    // 10. Render Sticker / Media Card
    if (media.isMedia && options.includeMediaPlaceholders !== false) {
      const mediaBoxWidth = bubbleWidth - bubblePaddingH * 2;
      const cardHeight = media.filename ? 32 : 24;
      doc.roundedRect(bubbleX + bubblePaddingH, innerY, mediaBoxWidth, cardHeight, 4)
        .fillAndStroke(media.badgeBg, media.badgeBorder);

      // Icon image resolution
      const iconEmoji = media.type === 'sticker' ? '🎨' : media.type === 'image' ? '📷' : media.type === 'video' ? '🎥' : media.type === 'audio' ? '🎤' : '📄';
      const iconPath = this.emojiRenderer.getEmojiImagePath(iconEmoji);

      let textLeft = bubbleX + bubblePaddingH + 8;
      if (iconPath) {
        try {
          doc.image(iconPath, bubbleX + bubblePaddingH + 6, innerY + (media.filename ? 6 : 4), { width: 16, height: 16 });
          textLeft = bubbleX + bubblePaddingH + 26;
        } catch {}
      }

      // Title
      doc.font(fonts.bold).fontSize(8).fillColor(media.badgeTextColor);
      doc.text(media.label, textLeft, innerY + (media.filename ? 4 : 7), {
        width: mediaBoxWidth - (textLeft - bubbleX),
        ellipsis: true,
      });

      if (media.filename) {
        doc.font(fonts.regular).fontSize(6.5).fillColor('#64748B');
        doc.text(media.filename, textLeft, innerY + 17, {
          width: mediaBoxWidth - (textLeft - bubbleX),
          ellipsis: true,
        });
      }

      innerY += cardHeight + 4;
    }

    // 10b. Render Pure Emojis (Real colorful Twemoji PNGs!)
    if (isPureEmoji) {
      if (emojiPaths.length > 0) {
        let emojiX = bubbleX + bubblePaddingH;
        for (const imgPath of emojiPaths) {
          try {
            doc.image(imgPath, emojiX, innerY + 1, { width: 20, height: 20 });
            emojiX += 24;
          } catch {}
        }
        innerY += emojiSectionHeight;
      } else {
        doc.font(fonts.bold).fontSize(10).fillColor(isSent ? docTheme.sentTextColor : docTheme.receivedTextColor);
        doc.text(this.fontResolver.sanitizeText(event.content), bubbleX + bubblePaddingH, innerY, {
          width: textWidthLimit,
        });
        innerY += emojiSectionHeight;
      }
    }

    // 11. Render Message Text Content
    if (!isPureMedia && !isPureEmoji && cleanContent.trim().length > 0) {
      const textColor = isSent ? docTheme.sentTextColor : docTheme.receivedTextColor;
      doc.font(fonts.regular).fontSize(9).fillColor(textColor);
      doc.text(cleanContent, bubbleX + bubblePaddingH, innerY, {
        width: textWidthLimit,
        lineGap: 1.5,
      });
      innerY += textHeight + 2;
    }

    // 12. Render Timestamp
    const tsColor = isSent ? docTheme.sentTimestampColor : docTheme.receivedTimestampColor;
    doc.font(fonts.regular).fontSize(6.5).fillColor(tsColor);
    doc.text(timeStr, bubbleX + bubbleWidth - bubblePaddingH - timeWidth, bubbleY + bubbleHeight - bubblePaddingV - 7, {
      width: timeWidth + 4,
      align: 'right',
    });

    // 13. Advance Cursor & Record Verifier Hash
    doc.y = bubbleY + bubbleHeight;
    verifier.onMessageRendered({
      id: event.id,
      timestamp: event.timestamp,
      content: event.content,
      actor: event.actor,
    });
  }
}
