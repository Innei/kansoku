import { Edition } from './edition.js';

export { Edition };
export const selectedEdition = new Edition().kind;

export function createEditionSummary(): string {
  return new Edition().summary();
}
