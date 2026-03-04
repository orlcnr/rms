import { PaginationMetaDto } from './pagination-meta.dto';

export class ApiResponseDto<T> {
  success: boolean;
  data: T | null;
  message?: string;
  meta?: PaginationMetaDto;
  statusCode?: number;
  timestamp?: string;

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    return {
      success: true,
      data,
      ...(message ? { message } : {}),
    };
  }

  static paginated<T>(
    data: T[],
    meta: PaginationMetaDto,
    message?: string,
  ): ApiResponseDto<T[]> {
    return {
      success: true,
      data,
      meta,
      ...(message ? { message } : {}),
    };
  }

  static empty(message?: string): ApiResponseDto<null> {
    return {
      success: true,
      data: null,
      ...(message ? { message } : {}),
    };
  }
}
