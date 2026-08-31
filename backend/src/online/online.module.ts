import { Module } from '@nestjs/common';
import { OnlineController } from './online.controller';
import { OnlineGatewayService } from './online-gateway.service';
import { OsintEnricherService } from './osint-enricher.service';
import { CloudLlmService } from './cloud-llm.service';

@Module({
  controllers: [OnlineController],
  providers: [OnlineGatewayService, OsintEnricherService, CloudLlmService],
  exports: [OnlineGatewayService, OsintEnricherService, CloudLlmService],
})
export class OnlineModule {}
