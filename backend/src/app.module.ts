import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { TextChatModule } from './analyzers/text-chat/text-chat.module';
import { DatasetsModule } from './datasets/datasets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    TextChatModule,
    DatasetsModule,
  ],
})
export class AppModule {}
