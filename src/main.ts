import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  // Enable WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Use cookie parser
  app.use(cookieParser());

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

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are provided
      transform: true // Transform payloads to DTO instances
    })
  );

  // Add /api prefix to all routes
  app.setGlobalPrefix('api');

  await app.listen(port);
}
bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  process.exit(1);
});
