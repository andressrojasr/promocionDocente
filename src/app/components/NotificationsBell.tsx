import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { cn } from './ui/utils';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notifications-service';
import { formatDateTime } from '../utils/format';
import type { NotificationDto } from '../types/api';

const POLL_INTERVAL_MS = 30_000;

/**
 * Campanita de notificaciones in-app: muestra el contador de no leídas,
 * refresca periódicamente y permite marcarlas como leídas.
 */
export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchNotifications();
      setNotifications(list.items);
      setUnreadCount(list.unreadCount);
    } catch {
      // Silencioso: la campanita no debe romper la página si el backend no responde.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const handleMarkRead = async (notification: NotificationDto) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
      await refresh();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No tiene notificaciones.</p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => void handleMarkRead(notification)}
                className={cn(
                  'w-full border-b border-border px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary',
                  !notification.isRead && 'bg-blue-50/70'
                )}
              >
                <div className="flex items-start gap-2">
                  {!notification.isRead && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-blue-500" />}
                  <div className={cn('min-w-0 flex-1', notification.isRead && 'pl-4')}>
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground whitespace-normal">{notification.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
