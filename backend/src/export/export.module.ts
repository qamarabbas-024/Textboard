import { Module } from '@nestjs/common';
import { ExportController, LegacyExportController } from './export.controller';
import { ExportService } from './export.service';
import { StreamPdfRendererService } from './stream-pdf-renderer.service';
import { FontResolverService } from './font-resolver.service';
import { EmojiRendererService } from './emoji-renderer.service';
import { DatasetsModule } from '../datasets/datasets.module';

@Module({
  imports: [DatasetsModule],
  controllers: [ExportController, LegacyExportController],
  providers: [ExportService, StreamPdfRendererService, FontResolverService, EmojiRendererService],
  exports: [ExportService, StreamPdfRendererService, FontResolverService, EmojiRendererService],
})
export class ExportModule {}
