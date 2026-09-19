import { api } from './api';
import type { User, APIResponse } from '../types';

export const authService = {
  async register(data: { name: string; email: string; password: string; confirmPassword: string }) {
    const response = await api.post<APIResponse<{ user: User; token: string }>>('/auth/register', data);
    return response.data;
  },

  async login(data: { email: string; password: string }) {
    const response = await api.post<APIResponse<{ user: User; token: string }>>('/auth/login', data);
    return response.data;
  },

  async getMe() {
    const response = await api.get<APIResponse<User>>('/auth/me');
    return response.data;
  },
};
