import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AccessTokenService } from './access-token.service';
import { AuthController } from './auth.controller';
import { AuthCryptoService } from './auth-crypto.service';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AccountStatusGuard } from './guards/account-status.guard';
import { OriginGuard } from './guards/origin.guard';
import { RecentStepUpGuard } from './guards/recent-step-up.guard';
import { RolesGuard } from './guards/roles.guard';
import { OtpDeliveryService } from './otp-delivery.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCryptoService,
    OtpDeliveryService,
    AccessTokenService,
    AccessTokenGuard,
    AccountStatusGuard,
    RolesGuard,
    OriginGuard,
    RecentStepUpGuard,
  ],
  exports: [
    AuthService,
    AuthCryptoService,
    AccessTokenGuard,
    AccountStatusGuard,
    RolesGuard,
    RecentStepUpGuard,
  ],
})
export class AuthModule {}
