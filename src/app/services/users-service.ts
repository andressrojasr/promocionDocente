import { httpClient } from './http-client';
import type { BackendRole, UserDto } from '../types/api';

export function fetchUsers(search?: string, role?: string): Promise<UserDto[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (role && role !== 'all') params.set('role', role);
  const query = params.toString();
  return httpClient.get<UserDto[]>(`/api/v1/users${query ? `?${query}` : ''}`);
}

export function changeUserRole(userId: string, role: BackendRole): Promise<UserDto> {
  return httpClient.patch<UserDto>(`/api/v1/users/${userId}/role`, { role });
}

export function changeUserStatus(userId: string, isActive: boolean): Promise<UserDto> {
  return httpClient.patch<UserDto>(`/api/v1/users/${userId}/status`, { isActive });
}
