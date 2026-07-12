import { Module } from '@nestjs/common';

import { ProfessionalsModule } from '../professionals/professionals.module';
import { AuthModule } from '../auth/auth.module';
import {
  AdminProfileController,
  MeController,
  ProfessionalProfileController,
} from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, ProfessionalsModule],
  controllers: [
    MeController,
    ProfessionalProfileController,
    AdminProfileController,
  ],
  providers: [UsersService],
})
export class UsersModule {}
