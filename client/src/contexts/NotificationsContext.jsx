import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { buildApiUrl, getApiUrl } from '../utils/api';
import { io } from 'socket.io-client';
import { useToast } from './ToastContext.jsx';
const NotificationsContext = createContext(null);
export const NotificationsProvider = ({
  children,
  pollIntervalMs = 30000
}) => {
  const {
    token
  } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const socketConnectedRef = useRef(false);
  const refreshTimerRef = useRef(null);
  const seenEventIdsRef = useRef(new Set());
  const fetchList = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/notifications?limit=20'), {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data?.data?.items || []);
      }
    } catch (e) {}
  };
  const refreshNow = () => {
    fetchUnread();
    fetchList();
  };
  const scheduleRefresh = () => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      refreshNow();
    }, 250);
  };
  const fetchUnread = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/notifications/unread-count'), {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data?.data?.count || 0);
      }
    } catch (e) {}
  };
  useEffect(() => {
    if (!token) return;
    fetchList();
    fetchUnread();

    const baseUrl = getApiUrl() || window.location.origin;
    const socket = io(baseUrl, {
      transports: ['websocket'],
      auth: {
        token
      }
    });
    socketRef.current = socket;
    socketConnectedRef.current = false;

    socket.on('connect', () => {
      socketConnectedRef.current = true;
      refreshNow();
    });
    socket.on('disconnect', () => {
      socketConnectedRef.current = false;
    });
    socket.on('notifications:new', payload => {
      const eventId = payload?.id ? String(payload.id) : null;
      if (eventId) {
        if (seenEventIdsRef.current.has(eventId)) return;
        seenEventIdsRef.current.add(eventId);
        setTimeout(() => {
          try {
            seenEventIdsRef.current.delete(eventId);
          } catch {}
        }, 8000);
      }
      const title = payload?.title;
      const message = payload?.message;
      const type = payload?.type;
      if (title || message) {
        toast.info([title, message].filter(Boolean).join(' - '), {
          duration: 4500
        });
      } else if (type) {
        toast.info('Bạn có thông báo mới', {
          duration: 4500
        });
      }
      scheduleRefresh();
    });

    const t = setInterval(() => {
      if (!socketConnectedRef.current) fetchUnread();
    }, pollIntervalMs);

    return () => {
      clearInterval(t);
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      try {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('notifications:new');
        socket.close();
      } catch {}
      socketRef.current = null;
      socketConnectedRef.current = false;
    };
  }, [token, pollIntervalMs]);
  const markRead = async id => {
    try {
      const res = await fetch(buildApiUrl(`/api/notifications/${id}/read`), {
        method: 'PATCH',
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      if (res.ok) {
        let wasUnread = false;
        setItems(prev => {
          wasUnread = prev.some(n => n._id === id && !n.read);
          return prev.map(n =>
            n._id === id
              ? {
                  ...n,
                  read: true,
                  readAt: new Date().toISOString()
                }
              : n
          );
        });
        if (wasUnread) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
      }
    } catch {}
  };
  const markAllRead = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/notifications/read-all'), {
        method: 'PATCH',
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      if (res.ok) {
        setItems(prev => prev.map(n => ({
          ...n,
          read: true,
          readAt: n.readAt || new Date().toISOString()
        })));
        setUnreadCount(0);
      }
    } catch {}
  };
  const value = useMemo(() => ({
    items,
    unreadCount,
    markRead,
    markAllRead,
    refresh: () => {
      refreshNow();
    }
  }), [items, unreadCount]);
  return <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>;
};
export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
};