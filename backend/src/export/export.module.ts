import { Module } from '@nestjs/common';
import { ExportController, LegacyExportController } from './export.controller';
import { ExportService } from './export.service';
import { StreamPdfRendererService } from './stream-pdf-renderer.service';
import { FontResolverService } from './font-resolver.service';
import { EmojiRendererService } from './emoji-renderer.service';
import { DossierGeneratorService } from './dossier-generator.service';
import { MarkdownVaultService } from './markdown-vault.service';
import { ObsidianVaultService } from './obsidian-vault.service';
import { DatasetsModule } from '../datasets/datasets.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [DatasetsModule, AnalyticsModule, PrismaModule],
  controllers: [ExportController, LegacyExportController],
  providers: [
    ExportService,
    StreamPdfRendererService,
    FontResolverService,
    EmojiRendererService,
    DossierGeneratorService,
    MarkdownVaultService,
    ObsidianVaultService,
  ],
  exports: [
    ExportService,
    StreamPdfRendererService,
    FontResolverService,
    EmojiRendererService,
    DossierGeneratorService,
    MarkdownVaultService,
    ObsidianVaultService,
  ],
})
export class ExportModule {}

