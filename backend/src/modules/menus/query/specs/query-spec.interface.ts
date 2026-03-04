import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface QuerySpec<T extends ObjectLiteral> {
  apply(qb: SelectQueryBuilder<T>): SelectQueryBuilder<T>;
}
