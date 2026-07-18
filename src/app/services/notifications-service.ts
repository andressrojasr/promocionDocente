import { httpClient } from './http-client';
import type { DashboardStats, NotificationList } from '../types/api';

export function fetchNotifications(unreadOnly = false): Promise<NotificationList> {
  return httpClient.get<NotificationList>(`/api/v1/notifications?unreadOnly=${unreadOnly}`);
}

export function markNotificationRead(notificationId: string): Promise<unknown> {
  return httpClient.post(`/api/v1/notifications/${notificationId}/read`);
}

export function markAllNotificationsRead(): Promise<unknown> {
  return httpClient.post('/api/v1/notifications/read-all');
}

export function fetchDashboardStats(): Promise<DashboardStats> {
  return httpClient.get<DashboardStats>('/api/v1/dashboard/stats');
}
