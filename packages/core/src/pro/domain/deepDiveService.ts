import type { DeepDiveStartResult, DeepDiveState } from '@kansoku/pro-api';

export interface DeepDiveService {
  startDeepDiveForNote(note: string): DeepDiveStartResult;
  deepDiveStatus(): DeepDiveState;
}
