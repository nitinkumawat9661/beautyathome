import { Module } from '@nestjs/common';
import { AdminCommerceController } from './admin-commerce.controller';
import { CommerceDomainService } from './commerce-domain.service';
import { CommerceService } from './commerce.service';
import { CustomerCommerceController } from './customer-commerce.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { ProfessionalCommerceController } from './professional-commerce.controller';

@Module({
  controllers: [
    CustomerCommerceController,
    ProfessionalCommerceController,
    AdminCommerceController,
    PaymentWebhookController,
  ],
  providers: [CommerceDomainService, CommerceService],
})
export class CommerceModule {}
