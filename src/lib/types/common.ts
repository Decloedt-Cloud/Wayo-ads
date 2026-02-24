export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeInput {
  startDate?: string;
  endDate?: string;
}

export interface SearchParams {
  search?: string;
}

export type SortOrder = 'asc' | 'desc';

export interface SortOptions {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface IdParam {
  id: string;
}

export interface IdsParam {
  ids: string[];
}

export interface BooleanFilter {
  equals?: boolean;
}

export interface NumberFilter {
  equals?: number;
  gte?: number;
  lte?: number;
  gt?: number;
  lt?: number;
}

export interface StringFilter {
  equals?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  in?: string[];
}

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface TimestampFields {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteFields {
  deletedAt?: Date | null;
}

export interface AuditFields {
  createdById?: string;
  updatedById?: string;
}
