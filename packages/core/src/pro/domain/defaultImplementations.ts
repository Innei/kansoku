import type { DeepDiveStartResult, DeepDiveState, ProAiTurnContext } from '@kansoku/pro-api';
import type { PreparedProAiTurn } from '../aiExtension.js';
import type { AiTurnPipeline } from './aiTurnPipeline.js';
import type { DeepDiveService } from './deepDiveService.js';
import type { FollowAutomation } from './followAutomation.js';

export class DisabledFollowAutomation implements FollowAutomation {
  requestImmediateFollow(_symbol: string): void {}
}

export class DisabledDeepDiveService implements DeepDiveService {
  startDeepDiveForNote(_note: string): DeepDiveStartResult {
    return { started: false, reason: 'disabled' };
  }

  deepDiveStatus(): DeepDiveState {
    return { running: false };
  }
}

export class EmptyAiTurnPipeline implements AiTurnPipeline {
  async prepareTurn(_context: ProAiTurnContext): Promise<PreparedProAiTurn> {
    return { readMounts: [], processors: [] };
  }
}
