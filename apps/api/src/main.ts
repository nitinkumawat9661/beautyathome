import cookieParser from 'cookie-parser';
import { json, urlencoded, type Express } from 'express';
import helmet from 'helmet';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { parseCorsOrigins, type Environment } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService<Environment, true>);
  const origins = parseCorsOrigins(config.get('CORS_ORIGINS', { infer: true }));

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: false, limit: '32kb' }));
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin || origins.includes(origin)) callback(null, true);
      else callback(new Error('Origin is not allowed'), false);
    },
  });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  if (config.get('TRUST_PROXY', { infer: true })) {
    const expressApp = app.getHttpAdapter().getInstance() as Express;
    expressApp.set('trust proxy', 1);
  }

  await app.listen(config.get('API_PORT', { infer: true }));
}
void bootstrap();
