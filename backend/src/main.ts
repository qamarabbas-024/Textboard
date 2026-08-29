import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3890,http://127.0.0.1:3890,http://localhost:3000,http://127.0.0.1:3000';

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  const host = process.env.TEXTBOARD_HOST || '127.0.0.1';
  await app.listen(port, host);
  console.log(`⚡ TextBoard Core running strictly local-first on http://${host}:${port} [Zero Cloud Invariant Verified]`);
}

bootstrap();
