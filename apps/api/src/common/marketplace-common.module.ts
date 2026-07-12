import { Global, Module } from '@nestjs/common';

import { CursorService } from './pagination/cursor.service';

@Global()
@Module({
  providers: [CursorService],
  exports: [CursorService],
})
export class MarketplaceCommonModule {}
