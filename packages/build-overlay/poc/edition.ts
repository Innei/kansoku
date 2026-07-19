import { BaseEdition } from './edition/base.js';

export class Edition extends BaseEdition {
  override readonly kind = 'oss' as const;
}
