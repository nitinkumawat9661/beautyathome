import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  AdminProfileController,
  MeController,
  ProfessionalProfileController,
} from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  controllers: [
    MeController,
    ProfessionalProfileController,
    AdminProfileController,
  ],
  providers: [UsersService],
})
export class UsersModule {}
