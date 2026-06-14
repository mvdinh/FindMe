import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ApplicantLayout from '../layout/ApplicantLayout';
import ApplicantModal from '../components/ApplicantModal';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../applicantLayoutClasses';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDateVN } from "@/utils/dateFormat";
import { Bell, Briefcase, Calendar, FileText, Trash2 } from 'lucide-react';

const NotificationsPage = () => {
  const { items: notifications = [], unreadCount = 0, markRead, markAllRead, refresh } = useNotifications() || {};
  const { token } = useAuth();
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatTime = timeString => {
    const time = new Date(timeString);
    const now = new Date();
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDateVN(time) || '—';
  };

  const markAsRead = async id => {
    try {
      await markRead(id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleRowClick = (e, n) => {
    if (e.target.closest('[data-notify-control]')) return;
    if (!n.read) markAsRead(n._id);
  };

  const toggleSelectNotification = id => {
    setSelectedNotifications(prev => (prev.includes(id) ? prev.filter(nId => nId !== id) : [...prev, id]));
  };

  const selectAllNotifications = () => {
    if (!notifications || notifications.length === 0) return;
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
        body: JSON.stringify({
          ids: selectedNotifications
        })
      });
      if (!res.ok) throw new Error('Failed to delete notifications');
      if (typeof refresh === 'function') {
        await refresh();
      }
      setSelectedNotifications([]);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const getUnreadCount = () => unreadCount || 0;

  const rowIcon = type => {
    const t = (type || '').toString();
    const cls = 'size-5 stroke-[1.75]';
    if (t.includes('interview')) return <Calendar className={cls} />;
    if (t.includes('application') || t.includes('feedback')) return <FileText className={cls} />;
    if (t.includes('job')) return <Briefcase className={cls} />;
    return <Bell className={cls} />;
  };

  const getNotificationColors = (type, read) => {
    const bg = read ? 'bg-card' : 'bg-destructive/5';
    const hoverBg = read ? 'hover:bg-muted/50' : 'hover:bg-destructive/10';
    let accent = 'text-muted-foreground';
    if (!read) {
      const t = (type || '').toString();
      if (t.includes('interview')) accent = 'text-primary';
      else if (t.includes('application') || t.includes('feedback') || t.includes('job')) accent = 'text-primary';
      else accent = 'text-primary';
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
    <ApplicantLayout>
      <div className={`${HR_PAGE} max-w-4xl`}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Thông báo</h1>
            <p className={HR_SUBTITLE}>Cập nhật từ findme về đơn ứng tuyển, lịch phỏng vấn và việc làm</p>
          </div>
          <div className="flex w-full flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap sm:w-auto sm:justify-end sm:gap-3">
            {getUnreadCount() > 0 && (
              <Button
                type="button"
                className="min-h-11 w-full touch-manipulation px-4 py-2.5 text-sm min-[420px]:w-auto font-['Roboto']"
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
                onClick={() => setShowDeleteModal(true)}
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
                  id="applicant-notify-select-all"
                  checked={selectedNotifications.length === notifications.length && notifications.length > 0}
                  onCheckedChange={() => selectAllNotifications()}
                />
                <label htmlFor="applicant-notify-select-all" className="cursor-pointer font-['Roboto'] text-sm text-foreground">
                  {selectedNotifications.length > 0 ? `${selectedNotifications.length} đã chọn` : 'Chọn tất cả'}
                </label>
              </div>
              <p className="font-['Roboto'] text-sm text-muted-foreground">{notifications.length} thông báo</p>
            </div>
          </CardHeader>

          <CardContent className="divide-y divide-border p-0">
            {notifications.length > 0 ? (
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
                    className={cn(
                      'flex items-start gap-4 p-4 text-left transition-colors duration-300',
                      colors.bg,
                      n.read ? 'hover:bg-muted/50' : `${colors.hoverBg} cursor-pointer`
                    )}
                  >
                    <div data-notify-control className="shrink-0 pt-1" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedNotifications.includes(n._id)}
                        onCheckedChange={() => toggleSelectNotification(n._id)}
                      />
                    </div>

                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                        colors.accent,
                        n.read ? 'bg-muted' : 'bg-primary/10'
                      )}
                    >
                      {rowIcon(n.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4
                              className={cn("line-clamp-2 font-['Open_Sans'] text-sm font-medium", colors.title)}
                              title={n.title}
                            >
                              {n.title}
                            </h4>
                            {!n.read && (
                              <div className="h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/25" aria-hidden />
                            )}
                          </div>

                          <p
                            className={cn("mb-2 line-clamp-3 font-['Roboto'] text-sm", colors.message)}
                            title={typeof n.message === 'string' ? n.message : undefined}
                          >
                            {n.message}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className={cn("font-['Roboto'] text-xs", colors.time)}>{formatTime(n.createdAt)}</span>
                            <Link
                              data-notify-control
                              to={`/notifications/${n._id}`}
                              onClick={e => {
                                e.stopPropagation();
                                markRead(n._id).catch(() => {});
                              }}
                              className={cn("font-['Roboto'] text-xs text-primary underline-offset-2 hover:underline")}
                            >
                              Xem chi tiết
                            </Link>
                          </div>
                        </div>
                        <div data-notify-control className="shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Xóa"
                          onClick={async e => {
                            e.stopPropagation();
                            try {
                              const res = await fetch(`/api/notifications/${n._id}`, {
                                method: 'DELETE',
                                headers: {
                                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                                }
                              });
                              if (!res.ok) throw new Error('Failed to delete');
                              if (typeof refresh === 'function') await refresh();
                            } catch (err) {
                              console.error('Delete notification failed', err);
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
            ) : (
              <div className="p-8 text-center">
                <Bell className="mx-auto size-12 text-muted-foreground/40" strokeWidth={1.5} />
                <h3 className="mt-2 font-['Open_Sans'] text-sm font-medium text-foreground">Không có thông báo</h3>
                <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">Bạn đã xem hết tất cả!</p>
              </div>
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

        <ApplicantModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Xoá thông báo"
          size="md"
          footer={
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowDeleteModal(false)} className="font-['Roboto']">
                Hủy
              </Button>
              <Button type="button" variant="destructive" onClick={deleteSelectedNotifications} className="font-['Roboto']">
                Xoá
              </Button>
            </div>
          }
        >
          <p className="font-['Roboto'] text-muted-foreground">
            Bạn có chắc muốn xoá {selectedNotifications.length} thông báo đã chọn không? Thao tác này cũng sẽ đánh dấu chúng là
            đã đọc.
          </p>
        </ApplicantModal>
      </div>
    </ApplicantLayout>
  );
};

export default NotificationsPage;
