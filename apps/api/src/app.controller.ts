import { Controller, Get } from '@nestjs/common';

import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  async getHealth(): Promise<{ database: 'connected'; status: 'ok' }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { database: 'connected', status: 'ok' };
  }
}
