import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  // Ensure uploads directory exists
  const uploadsPath = process.env.NODE_ENV === 'production' ? join(__dirname, '..', 'uploads') : join(process.cwd(), 'uploads');
  try {
    mkdirSync(join(uploadsPath, 'logos'), { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }

  // Serve static files from uploads directory
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/'
  });

  // Add /api prefix to all routes
  app.setGlobalPrefix('api');

  await app.listen(port);
}
bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  process.exit(1);
});
