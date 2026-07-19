import type { DeepDiveStartResult, DeepDiveState, ProAiTurnContext } from '@kansoku/pro-api';
import type { PreparedProAiTurn } from '../aiExtension.js';
import { prepareProAiTurn } from '../aiExtension.js';
import type { EditionRuntimeStatus, EditionRuntimeStatusReader } from '../editionRuntime.js';
import { getPro, getProHooks, hasEncBundle } from '../registry.js';
import type { AiTurnPipeline } from './aiTurnPipeline.js';
import type { DeepDiveService } from './deepDiveService.js';
import type { FollowAutomation } from './followAutomation.js';

export class LegacyFollowAutomation implements FollowAutomation {
  requestImmediateFollow(symbol: string): Promise<void> | void {
    return getProHooks().requestImmediateFollow(symbol);
  }
}

export class LegacyDeepDiveService implements DeepDiveService {
  startDeepDiveForNote(note: string): DeepDiveStartResult {
    return getProHooks().startDeepDiveForNote(note);
  }

  deepDiveStatus(): DeepDiveState {
    return getProHooks().deepDiveStatus();
  }
}

export class LegacyAiTurnPipeline implements AiTurnPipeline {
  prepareTurn(context: ProAiTurnContext): Promise<PreparedProAiTurn> {
    return prepareProAiTurn(context);
  }
}

export class LegacyEditionRuntimeStatusReader implements EditionRuntimeStatusReader {
  get status(): EditionRuntimeStatus {
    return {
      // The legacy in-process registry protocol has no "incompatible"/"failed"
      // states — a module is either registered (active), an enc bundle sits
      // unregistered (locked), or nothing is present (absent).
      state: getPro() != null ? 'active' : hasEncBundle() ? 'locked' : 'absent',
      bundlePresent: hasEncBundle(),
      keyId: undefined,
    };
  }
}
