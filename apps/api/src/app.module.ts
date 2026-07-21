import { resolve } from 'node:path';

import {
  MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { AccessTokenGuard } from './auth/guards/access-token.guard';
import { AccountStatusGuard } from './auth/guards/account-status.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { RecentStepUpGuard } from './auth/guards/recent-step-up.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AvailabilityModule } from './availability/availability.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommerceModule } from './commerce/commerce.module';
import { SensitiveResponseInterceptor } from './common/interceptors/sensitive-response.interceptor';
import { MarketplaceCommonModule } from './common/marketplace-common.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { ProfessionalApplicationsModule } from './professional-applications/professional-applications.module';
import { ProfessionalServicesModule } from './professional-services/professional-services.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../../.env'),
      ],
      validate: validateEnvironment,
      cache: true,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    MarketplaceCommonModule,
    AuditModule,
    AuthModule,
    CatalogModule,
    CommerceModule,
    ProfessionalApplicationsModule,
    ProfessionalServicesModule,
    ProfessionalsModule,
    AvailabilityModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: AccountStatusGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RecentStepUpGuard },
    { provide: APP_INTERCEPTOR, useClass: SensitiveResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes(
        { path: '/', method: RequestMethod.ALL },
        { path: '{*splat}', method: RequestMethod.ALL },
      );
  }
}
