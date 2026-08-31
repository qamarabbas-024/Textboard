import { Controller, Post, Body, Param } from '@nestjs/common';
import { BatesStampingService, BatesConfig } from './bates-stamping.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/privacy')
export class PrivacyController {
  constructor(
    private readonly batesService: BatesStampingService,
    private readonly prisma: PrismaService,
  ) {}

  @Post(':datasetId/bates')
  async generateBatesDossier(
    @Param('datasetId') datasetId: string,
    @Body() config: BatesConfig,
  ) {
    const events = await this.prisma.timelineEvent.findMany({
      where: { datasetId },
      orderBy: { timestamp: 'asc' },
      take: 5000,
      select: { id: true, actor: true, content: true, timestamp: true },
    });

    return this.batesService.applyBatesStamping(events, config);
  }
}
