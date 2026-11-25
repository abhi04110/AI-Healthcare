import { api, toFormBody } from '@/lib/api';
import type { TokenResponse, UserResponse, UserRole } from '@/types/api';

export const authService = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>(
      '/auth/login',
      toFormBody({ email: email.trim().toLowerCase(), password }),
    );
    return data;
  },

  async registerPatient(name: string, email: string, password: string): Promise<UserResponse> {
    const { data } = await api.post<UserResponse>(
      '/auth/register',
      toFormBody({ name: name.trim(), email: email.trim().toLowerCase(), password }),
    );
    return data;
  },

  async getMe(): Promise<UserResponse> {
    const { data } = await api.get<UserResponse>('/auth/me');
    return data;
  },

  async createUserByAdmin(payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<UserResponse> {
    const { data } = await api.post<UserResponse>(
      '/auth/users',
      toFormBody({
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        role: payload.role,
      }),
    );
    return data;
  },

  async updateUserRole(userId: number, role: UserRole): Promise<UserResponse> {
    const { data } = await api.put<UserResponse>(
      `/auth/users/${userId}/role`,
      toFormBody({ role }),
    );
    return data;
  },

  async getHealth(): Promise<{ status: string }> {
    const { data } = await api.get<{ status: string }>('/health');
    return data;
  },

  async checkDatabase(): Promise<{ status: string; message: string }> {
    const { data } = await api.get<{ status: string; message: string }>('/database-check');
    return data;
  },

  async getTables(): Promise<{ status: string; tables?: string[]; message?: string }> {
    const { data } = await api.get<{ status: string; tables?: string[]; message?: string }>('/tables');
    return data;
  },
};

