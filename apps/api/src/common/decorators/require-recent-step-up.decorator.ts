import { SetMetadata } from '@nestjs/common';

export const REQUIRE_RECENT_STEP_UP_KEY = 'requireRecentStepUp';

export const RequireRecentStepUp = (): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_RECENT_STEP_UP_KEY, true);
