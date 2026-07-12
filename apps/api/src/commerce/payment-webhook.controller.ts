import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CommerceService } from './commerce.service';
import { WebhookSchema, type WebhookInput } from './commerce.validation';

@Public()
@Controller('webhooks/payments')
export class PaymentWebhookController {
  constructor(private readonly commerce: CommerceService) {}
  @Post('razorpay') handle(
    @Body(new ZodValidationPipe(WebhookSchema)) input: WebhookInput,
  ) {
    return this.commerce.webhook(input);
  }
}
