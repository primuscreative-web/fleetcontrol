export abstract class Entity<TId extends string = string> {
  protected constructor(public readonly id: TId) {}

  equals(entity?: Entity<TId>): boolean {
    return Boolean(entity && entity.id === this.id);
  }
}
