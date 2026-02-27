import { env } from './env';

interface AuthApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  app_role?: string | null;
  app_roles: Array<{ app: string; role: string }>;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  user: AuthUser;
  access_token: string;
  token_type: string;
  expires_at: string | null;
}

interface RegisterResponse {
  user: AuthUser;
  access_token?: string;
  token_type?: string;
  expires_at?: string | null;
  message?: string;
}

interface UserResponse {
  user: AuthUser;
  scopes: string[];
}

class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<AuthApiResponse<T>> {
  const url = `${env.AUTH_API_URL}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  const data: AuthApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new AuthApiError(
      data.message || 'Authentication API error',
      response.status,
      data.errors,
    );
  }

  return data;
}

export async function authApiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await authFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      app: env.AUTH_APP_NAME,
      app_key: env.AUTH_APP_KEY,
    }),
  });

  return res.data!;
}

export async function authApiRegister(params: {
  name: string;
  email: string;
  password: string;
  role?: string;
}): Promise<RegisterResponse> {
  const res = await authFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      app: env.AUTH_APP_NAME,
      app_key: env.AUTH_APP_KEY,
    }),
  });

  return res.data!;
}

export async function authApiGetUser(
  accessToken: string,
): Promise<UserResponse> {
  const res = await authFetch<UserResponse>(
    `/auth/user?app=${env.AUTH_APP_NAME}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return res.data!;
}

export { AuthApiError };
export type { AuthUser, LoginResponse, RegisterResponse };
