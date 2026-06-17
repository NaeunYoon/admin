import { create } from 'zustand';
import { api } from '../api';

export interface Notification {
  id: string;
  type: 'task_assigned' | 'comment_added';
  title: string;
  body: string;
  ref_id: string;
  is_read: number;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetch: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetch: async () => {
    try {
      const data: Notification[] = await api.getNotifications();
      set({ notifications: data, unreadCount: data.filter(n => !n.is_read).length });
    } catch {}
  },

  markRead: (id) => {
    api.markNotificationRead(id).catch(() => {});
    set(s => {
      const notifications = s.notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n);
      return { notifications, unreadCount: notifications.filter(n => !n.is_read).length };
    });
  },

  markAllRead: () => {
    api.markAllNotificationsRead().catch(() => {});
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, is_read: 1 })),
      unreadCount: 0,
    }));
  },
}));
