import { Module } from '@nestjs/common';
import { AnonymizerService } from './anonymizer.service';
import { BatesStampingService } from './bates-stamping.service';
import { PrivacyController } from './privacy.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrivacyController],
  providers: [AnonymizerService, BatesStampingService],
  exports: [AnonymizerService, BatesStampingService],
})
export class PrivacyModule {}
