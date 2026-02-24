export type UserRole = 'USER' | 'ADVERTISER' | 'CREATOR' | 'SUPERADMIN';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  image?: string | null;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRole extends User {
  role: UserRole;
}

export interface CreateUserInput {
  email: string;
  name?: string;
  password?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  image?: string;
  role?: UserRole;
}

export interface UserListParams {
  role?: UserRole;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
