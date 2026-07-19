export class BaseEdition {
  readonly kind: 'oss' | 'pro' = 'oss';

  protected featureLabel(): string {
    return 'oss-edition-poc';
  }

  summary(): string {
    return `${this.kind}:${this.featureLabel()}`;
  }
}
