import {
  AdminProfessionalListQuerySchema,
  CursorPaginationQuerySchema,
  AdminVerificationDecisionSchema,
  AdminVerificationNoteCreateSchema,
  VerificationStartReviewSchema,
  type AdminProfessionalListQuery,
  type AdminVerificationDecision,
  type AdminVerificationNoteCreate,
  type VerificationStartReview,
} from '@beautyathome/marketplace';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { z } from 'zod';

import { CurrentActor } from '../common/decorators/current-actor.decorator';
import { CurrentRequestId } from '../common/decorators/current-request-id.decorator';
import { RequireRecentStepUp } from '../common/decorators/require-recent-step-up.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import {
  ProfessionalIdSchema,
  ProfessionalStatusChangeSchema,
  VerificationApplicationIdSchema,
  VerificationApplicationListQuerySchema,
} from './professionals.validation';
import { ProfessionalsService } from './professionals.service';
import { VerificationService } from './verification.service';

type VerificationApplicationListQuery = z.infer<
  typeof VerificationApplicationListQuerySchema
>;
type ProfessionalStatusChange = z.infer<typeof ProfessionalStatusChangeSchema>;
type VerificationNoteListQuery = z.infer<typeof CursorPaginationQuerySchema>;

@Roles('ADMIN')
@Controller('admin')
export class AdminVerificationController {
  constructor(
    private readonly professionals: ProfessionalsService,
    private readonly verification: VerificationService,
  ) {}

  @Get('professionals')
  listProfessionals(
    @Query(new ZodValidationPipe(AdminProfessionalListQuerySchema))
    query: AdminProfessionalListQuery,
  ) {
    return this.professionals.listAdmin(query);
  }

  @Get('verification-applications')
  listApplications(
    @Query(new ZodValidationPipe(VerificationApplicationListQuerySchema))
    query: VerificationApplicationListQuery,
  ) {
    return this.verification.listAdmin(query);
  }

  @Get('verification-applications/:applicationId')
  getApplication(
    @Param(
      'applicationId',
      new ZodValidationPipe(VerificationApplicationIdSchema),
    )
    applicationId: string,
  ) {
    return this.verification.getAdmin(applicationId);
  }

  @Post('verification-applications/:applicationId/start-review')
  startReview(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param(
      'applicationId',
      new ZodValidationPipe(VerificationApplicationIdSchema),
    )
    applicationId: string,
    @Body(new ZodValidationPipe(VerificationStartReviewSchema))
    input: VerificationStartReview,
  ) {
    return this.verification.startReview(
      actor,
      applicationId,
      input.expectedVersion,
      requestId,
    );
  }

  @RequireRecentStepUp()
  @Post('verification-applications/:applicationId/decision')
  decide(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param(
      'applicationId',
      new ZodValidationPipe(VerificationApplicationIdSchema),
    )
    applicationId: string,
    @Body(new ZodValidationPipe(AdminVerificationDecisionSchema))
    input: AdminVerificationDecision,
  ) {
    return this.verification.decide(actor, applicationId, input, requestId);
  }

  @Get('verification-applications/:applicationId/notes')
  listNotes(
    @Param(
      'applicationId',
      new ZodValidationPipe(VerificationApplicationIdSchema),
    )
    applicationId: string,
    @Query(new ZodValidationPipe(CursorPaginationQuerySchema))
    query: VerificationNoteListQuery,
  ) {
    return this.verification.listNotes(applicationId, query);
  }

  @Post('verification-applications/:applicationId/notes')
  addNote(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param(
      'applicationId',
      new ZodValidationPipe(VerificationApplicationIdSchema),
    )
    applicationId: string,
    @Body(new ZodValidationPipe(AdminVerificationNoteCreateSchema))
    input: AdminVerificationNoteCreate,
  ) {
    return this.verification.addNote(actor, applicationId, input, requestId);
  }

  @RequireRecentStepUp()
  @Post('professionals/:professionalId/status')
  changeStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @CurrentRequestId() requestId: string,
    @Param('professionalId', new ZodValidationPipe(ProfessionalIdSchema))
    professionalId: string,
    @Body(new ZodValidationPipe(ProfessionalStatusChangeSchema))
    input: ProfessionalStatusChange,
  ) {
    return this.verification.changeProfessionalStatus(
      actor,
      professionalId,
      input,
      requestId,
    );
  }
}
