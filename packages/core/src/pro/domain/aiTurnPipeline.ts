import type { ProAiTurnContext } from '@kansoku/pro-api';
import type { PreparedProAiTurn } from '../aiExtension.js';

export interface AiTurnPipeline {
  prepareTurn(context: ProAiTurnContext): Promise<PreparedProAiTurn>;
}
