import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { OnlineGatewayService, OnlineSettings } from './online-gateway.service';
import { OsintEnricherService } from './osint-enricher.service';
import { CloudLlmService, CloudLlmRequest } from './cloud-llm.service';

@Controller('api/v1/online')
export class OnlineController {
  constructor(
    private readonly gateway: OnlineGatewayService,
    private readonly osint: OsintEnricherService,
    private readonly cloudLlm: CloudLlmService,
  ) {}

  @Get('settings')
  getSettings() {
    return this.gateway.getSettings();
  }

  @Post('settings')
  updateSettings(@Body() body: Partial<OnlineSettings>) {
    return this.gateway.updateSettings(body);
  }

  @Get('osint/ip')
  async checkIp(@Query('ip') ip: string) {
    return this.osint.checkIpReputation(ip || '127.0.0.1');
  }

  @Get('osint/url')
  async checkUrl(@Query('url') url: string) {
    return this.osint.checkUrlReputation(url || 'https://google.com');
  }

  @Get('osint/crypto')
  async checkCrypto(
    @Query('address') address: string,
    @Query('chain') chain: string,
  ) {
    return this.osint.checkCryptoBalance(address || '', chain || 'BITCOIN');
  }

  @Post('llm/ask')
  async askCloudLlm(@Body() body: CloudLlmRequest) {
    return this.cloudLlm.queryCloudLlm(body);
  }
}
