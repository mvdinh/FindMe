import React from 'react';
import { Link } from 'react-router-dom';
import HRLayout from '../layout/HRLayout';
import HRModal from '../components/HRModal';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../hrLayoutClasses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Trash2 } from 'lucide-react';
import { formatDateVN } from '../hrDateFormat';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useAuth } from '../../contexts/AuthContext';

const HRNotifications = () => {
  const { items: notifications, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const { token } = useAuth();
  const [selectedNotifications, setSelectedNotifications] = React.useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const formatTime = timeString => {
    const time = new Date(timeString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
    const diffDays = Math.floor(diffInMinutes / 1440);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDateVN(time) || '—';
  };

  const markAsRead = notificationId => {
    markRead(notificationId).catch(() => {});
  };

  const handleRowClick = (e, n) => {
    if (e.target.closest('[data-notify-control]')) return;
    if (!n.read) markAsRead(n._id);
  };

  const toggleSelectNotification = notificationId => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId) ? prev.filter(id => id !== notificationId) : [...prev, notificationId]
    );
  };

  const selectAllNotifications = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  const deleteSelectedNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ids: selectedNotifications })
      });
      if (!res.ok) throw new Error('Không xóa được thông báo');
      if (typeof refresh === 'function') await refresh();
      setSelectedNotifications([]);
      setShowDeleteConfirm(false);
    } catch (e) {
      console.error('HR bulk delete failed', e);
    }
  };

  const renderIcon = (iconType, colorClass) => {
    const svgClass = `w-5 h-5 ${colorClass} stroke-current`;
    switch (iconType) {
      case 'user-plus':
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM12 15h2m-2 4h4m-4 0v-2m0 2h-4" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'clock':
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'document-report':
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h13M9 11L4 16m5-5l5 5" />
          </svg>
        );
      case 'arrow-right':
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        );
      case 'check-circle':
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'megaphone':
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'bell':
        return (
          <svg className="w-5 h-5 text-primary stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      default:
        return (
          <svg className={svgClass} fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  const getNotificationColors = (type, read) => {
    const bg = read ? 'bg-card' : 'bg-destructive/5';
    const hoverBg = read ? 'hover:bg-muted/60' : 'hover:bg-destructive/10';
    let accent = 'text-muted-foreground';
    if (!read) {
      switch (type) {
        case 'interview':
        case 'application':
          accent = 'text-primary';
          break;
        case 'deadline':
          accent = 'text-destructive';
          break;
        default:
          accent = 'text-primary';
          break;
      }
    }
    return {
      bg,
      hoverBg,
      accent,
      title: read ? 'text-muted-foreground' : 'text-foreground',
      message: read ? 'text-muted-foreground' : 'text-foreground/90',
      time: 'text-muted-foreground'
    };
  };

  return (
    <HRLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Thông báo</h1>
            <p className={HR_SUBTITLE}>Cập nhật từ findme về tin đăng, hồ sơ và lịch phỏng vấn</p>
          </div>
          <div className="flex w-full flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap sm:w-auto sm:justify-end sm:gap-3">
            {unreadCount > 0 && (
              <Button
                type="button"
                className="min-h-11 w-full touch-manipulation px-4 py-2.5 text-sm min-[420px]:w-auto"
                onClick={() => markAllRead().catch(() => {})}
              >
                Đánh dấu tất cả đã đọc
              </Button>
            )}
            {selectedNotifications.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 w-full touch-manipulation px-4 py-2.5 text-sm min-[420px]:w-auto font-['Roboto']"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Xóa {selectedNotifications.length} mục đã chọn
              </Button>
            )}
          </div>
        </div>

        <Card className="overflow-hidden shadow-sm sm:rounded-lg">
          <CardHeader className="border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="hr-notify-select-all"
                  checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                  onCheckedChange={() => selectAllNotifications()}
                />
                <label htmlFor="hr-notify-select-all" className="cursor-pointer text-sm font-['Roboto'] text-foreground">
                  {selectedNotifications.length > 0 ? `${selectedNotifications.length} đã chọn` : 'Chọn tất cả'}
                </label>
              </div>
              <p className="text-sm text-muted-foreground font-['Roboto']">{notifications.length} thông báo</p>
            </div>
          </CardHeader>

          <CardContent className="divide-y divide-border p-0">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto size-12 text-muted-foreground/40" strokeWidth={1.5} />
                <h3 className="mt-2 font-['Open_Sans'] text-sm font-medium text-foreground">Không có thông báo</h3>
                <p className="mt-1 text-sm text-muted-foreground font-['Roboto']">Bạn đã xem hết tất cả!</p>
              </div>
            ) : (
              notifications.map(notification => {
                const n = notification;
                const colors = getNotificationColors(n.type, n.read);
                return (
                  <div
                    key={n._id}
                    role={!n.read ? 'button' : undefined}
                    tabIndex={!n.read ? 0 : undefined}
                    onClick={e => handleRowClick(e, n)}
                    onKeyDown={e => {
                      if (e.target.closest('[data-notify-control]')) return;
                      if ((e.key === 'Enter' || e.key === ' ') && !n.read) {
                        e.preventDefault();
                        markAsRead(n._id);
                      }
                    }}
                    className={`flex items-start space-x-4 p-4 text-left transition-colors duration-300 ${colors.bg} ${n.read ? 'hover:bg-muted/50' : `${colors.hoverBg} cursor-pointer`}`}
                  >
                    <div data-notify-control className="flex-shrink-0 pt-1" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedNotifications.includes(n._id)}
                        onCheckedChange={() => toggleSelectNotification(n._id)}
                      />
                    </div>

                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${colors.accent} ${n.read ? 'bg-muted' : 'bg-primary/10'}`}
                    >
                      {renderIcon(n.icon, colors.accent)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center space-x-2">
                            <h4
                              className={`line-clamp-2 text-sm font-medium font-['Open_Sans'] ${colors.title}`}
                              title={n.title}
                            >
                              {n.title}
                            </h4>
                            {!n.read && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/25" aria-hidden />
                            )}
                          </div>
                          <p
                            className={`mb-2 line-clamp-3 text-sm font-['Roboto'] ${colors.message}`}
                            title={typeof n.message === 'string' ? n.message : undefined}
                          >
                            {n.message}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className={`text-xs font-['Roboto'] ${colors.time}`}>{formatTime(n.createdAt)}</span>
                            <Link
                              data-notify-control
                              to={`/hr/notifications/${n._id}`}
                              onClick={e => {
                                e.stopPropagation();
                                markRead(n._id).catch(() => {});
                              }}
                              className="text-xs font-['Roboto'] text-primary underline-offset-2 hover:underline"
                            >
                              Xem chi tiết
                            </Link>
                          </div>
                        </div>
                        <div data-notify-control className="ml-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Xóa"
                            onClick={async () => {
                              if (!window.confirm("Bạn có chắc chắn muốn xóa thông báo này không?")) return;
                              try {
                                const res = await fetch(`/api/notifications/${n._id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                                  }
                                });
                                if (!res.ok) throw new Error('Không xóa được thông báo');
                                if (typeof refresh === 'function') await refresh();
                              } catch (err) {
                                console.error('HR single delete failed', err);
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>

          {notifications.length > 0 && (
            <div className="border-t p-4 text-center">
              <Button
                type="button"
                variant="link"
                className="font-['Roboto'] text-muted-foreground"
                onClick={() => (typeof refresh === 'function' ? refresh() : null)}
              >
                Tải thêm thông báo
              </Button>
            </div>
          )}
        </Card>
      </div>

      <HRModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="md"
        title="Xóa thông báo"
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Hủy
            </Button>
            <Button type="button" variant="destructive" onClick={deleteSelectedNotifications}>
              Xóa
            </Button>
          </div>
        }
      >
        <p className="font-['Roboto'] text-muted-foreground">
          Bạn có chắc chắn muốn xóa {selectedNotifications.length} thông báo đã chọn? Hành động này không thể hoàn tác.
        </p>
      </HRModal>
    </HRLayout>
  );
};

export default HRNotifications;
