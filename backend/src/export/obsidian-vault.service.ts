import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as AdmZip from 'adm-zip';

export interface VaultFile {
  relativePath: string;
  content: string;
}

@Injectable()
export class ObsidianVaultService {
  private readonly logger = new Logger(ObsidianVaultService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates an Obsidian Markdown Vault package with internal [[wiki-links]].
   */
  async generateObsidianVaultZip(datasetId: string): Promise<{ filename: string; buffer: Buffer }> {
    const dataset = await this.prisma.dataset.findUnique({
      where: { id: datasetId },
    });

    if (!dataset) {
      throw new NotFoundException(`Dataset ${datasetId} not found`);
    }

    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      orderBy: { timestamp: 'asc' },
    });

    const zip = new AdmZip();
    const sanitizedName = dataset.name.replace(/[^a-zA-Z0-9_\-]/g, '_');

    // 1. Vault Root README / Index Note
    const rootIndex = `---
title: "${dataset.name}"
source_type: "${dataset.sourceType}"
total_events: ${events.length}
vault_generator: "Textboard Forensic Intelligence"
created_at: "${new Date().toISOString()}"
tags:
  - textboard
  - archive
  - forensic
---

# ⚡ ${dataset.name} — Obsidian Intelligence Vault

This vault contains an interconnected timeline of **${events.length.toLocaleString()} records** ingested and processed via TextBoard.

## 📂 Navigation & Graph Directory
- [[Participants]]: Complete registry of all communication actors
- [[Daily Notes]]: Day-by-day chronological log with internal bidirectional links
- [[Key Highlights]]: Curated milestones and longest communications
`;
    zip.addFile(`${sanitizedName}/Index.md`, Buffer.from(rootIndex, 'utf-8'));

    // 2. Participants Registry
    const actorsMap = new Map<string, { count: number; firstActive: Date; lastActive: Date }>();
    const datesMap = new Map<string, typeof events>();

    for (const ev of events) {
      const actor = ev.actor || 'System';
      const existing = actorsMap.get(actor) || {
        count: 0,
        firstActive: ev.timestamp,
        lastActive: ev.timestamp,
      };
      existing.count++;
      existing.lastActive = ev.timestamp;
      actorsMap.set(actor, existing);

      const dateStr = ev.timestamp.toISOString().slice(0, 10);
      const dateList = datesMap.get(dateStr) || [];
      dateList.push(ev);
      datesMap.set(dateStr, dateList);
    }

    let participantsContent = `# 👥 Participants Directory\n\n`;
    for (const [actor, stats] of actorsMap.entries()) {
      const safeActorName = actor.replace(/[/\\?%*:|"<>]/g, '_');
      participantsContent += `- [[Participants/${safeActorName}|${actor}]] (${stats.count.toLocaleString()} messages)\n`;

      // Individual Actor Note
      const actorNote = `---
actor: "${actor}"
total_messages: ${stats.count}
first_active: "${stats.firstActive.toISOString()}"
last_active: "${stats.lastActive.toISOString()}"
tags:
  - participant
  - ${dataset.sourceType}
---

# 👤 ${actor}

- **Total Messages**: ${stats.count.toLocaleString()}
- **First Active**: ${stats.firstActive.toLocaleDateString()}
- **Last Active**: ${stats.lastActive.toLocaleDateString()}

## 🔗 Connected Days
${Array.from(datesMap.keys())
  .filter((d) => datesMap.get(d)!.some((e) => (e.actor || 'System') === actor))
  .slice(0, 50)
  .map((d) => `- [[Daily Notes/${d}|${d}]]`)
  .join('\n')}
`;
      zip.addFile(`${sanitizedName}/Participants/${safeActorName}.md`, Buffer.from(actorNote, 'utf-8'));
    }
    zip.addFile(`${sanitizedName}/Participants.md`, Buffer.from(participantsContent, 'utf-8'));

    // 3. Daily Notes (Interconnected by Date)
    for (const [dateStr, dayEvents] of datesMap.entries()) {
      let dayContent = `---
date: "${dateStr}"
message_count: ${dayEvents.length}
tags:
  - daily-note
---

# 📅 ${dateStr}

`;
      for (const ev of dayEvents) {
        const timeStr = ev.timestamp.toTimeString().slice(0, 8);
        const safeActor = (ev.actor || 'System').replace(/[/\\?%*:|"<>]/g, '_');
        dayContent += `### [${timeStr}] [[Participants/${safeActor}|${ev.actor || 'System'}]]\n${ev.content}\n\n`;
      }
      zip.addFile(`${sanitizedName}/Daily Notes/${dateStr}.md`, Buffer.from(dayContent, 'utf-8'));
    }

    return {
      filename: `${sanitizedName}_Obsidian_Vault.zip`,
      buffer: zip.toBuffer(),
    };
  }
}
