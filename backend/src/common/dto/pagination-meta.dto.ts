export class PaginationMetaDto {
  page: number;
  limit: number;
  itemCount: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;

  constructor(partial: PaginationMetaDto) {
    Object.assign(this, partial);
  }
}
