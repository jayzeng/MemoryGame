import type { DurableObjectNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  LEADERBOARD_DO: DurableObjectNamespace;
  PROFILE_PICS: R2Bucket;
}
