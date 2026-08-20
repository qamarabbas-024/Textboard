import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigin = process.env.CORS_ORIGIN;

  if (isProduction && !corsOrigin) {
    throw new Error(
      'CORS_ORIGIN environment variable is required in production environment.',
    );
  }

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((o) => o.trim()) : true,
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend server running on http://127.0.0.1:${port}`);
}

bootstrap();
