import {
  AdminAuditListQuerySchema,
  AuditEventIdSchema,
  type AdminAuditListQuery,
} from '@beautyathome/marketplace';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuditService } from './audit.service';

@Roles('ADMIN')
@Controller('admin/audit-events')
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(AdminAuditListQuerySchema))
    query: AdminAuditListQuery,
  ) {
    return this.audit.list(query);
  }

  @Get(':eventId')
  get(
    @Param('eventId', new ZodValidationPipe(AuditEventIdSchema))
    eventId: string,
  ) {
    return this.audit.get(eventId);
  }
}
