import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MessageCircle,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HR_PAGE } from '../../recruiter/recruiterLayoutClasses';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { buildApiUrl } from '../../utils/api';
import { formatDateTimeVN } from "@/utils/dateFormat";
import { cn } from '@/lib/utils';

const TYPE_LABELS = {
  application: 'Ứng tuyển',
  application_submitted: 'Đã nộp đơn',
  application_status_changed: 'Trạng thái đơn',
  interview: 'Phỏng vấn',
  interview_scheduled: 'Lịch phỏng vấn',
  interview_rescheduled: 'Đổi lịch PV',
  interview_cancelled: 'Hủy lịch PV',
  feedback: 'Phản hồi',
  feedback_submitted: 'Đã gửi phản hồi',
  deadline: 'Hạn chót',
  job: 'Việc làm',
  job_created: 'Tin tuyển dụng',
  account_created: 'Tài khoản',
  system: 'Hệ thống'
};

function NotificationTypeIcon({ type, className }) {
  const t = (type || '').toString();
  const iconClass = cn('stroke-[1.75]', className);
  if (t.includes('interview')) return <Calendar className={iconClass} />;
  if (t.includes('application')) return <FileText className={iconClass} />;
  if (t.includes('job')) return <Briefcase className={iconClass} />;
  if (t.includes('feedback')) return <MessageCircle className={iconClass} />;
  if (t.includes('deadline')) return <Clock className={iconClass} />;
  if (t.includes('account')) return <UserPlus className={iconClass} />;
  return <Bell className={iconClass} />;
}

const NotificationDetailPage = ({ Layout, listPath }) => {
  const { notificationId } = useParams();
  const { token } = useAuth();
  const { markRead, refresh } = useNotifications();
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!notificationId) {
        setError('Thiếu mã thông báo');
        setLoading(false);
        return;
      }
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      markRead(notificationId).catch(() => {});
      try {
        const res = await fetch(buildApiUrl(`/api/notifications/${notificationId}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.message || 'Không tải được thông báo');
        }
        const data = json?.data;
        if (cancelled) return;
        if (data) {
          setNotif({
            ...data,
            read: true,
            readAt: data.readAt || new Date().toISOString()
          });
          if (typeof refresh === 'function') refresh();
        } else {
          setNotif(null);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Lỗi tải thông báo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notificationId, token]);

  const typeLabel = notif?.type ? TYPE_LABELS[notif.type] || notif.type : '';

  return (
    <Layout>
      <div className={cn(HR_PAGE, 'mx-auto max-w-xl')}>
        <header className="mb-4 flex items-center gap-2 sm:mb-6">
          <Button variant="ghost" size="icon" className="size-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted" asChild>
            <Link to={listPath} aria-label="Quay lại danh sách thông báo">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-['Open_Sans'] text-lg font-semibold tracking-tight text-foreground sm:text-xl">Thông báo</h1>
            <p className="font-['Roboto'] text-xs text-muted-foreground sm:text-sm">Chi tiết & cập nhật từ hệ thống</p>
          </div>
        </header>

        {loading && (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="font-['Roboto'] text-sm">Đang tải thông báo…</span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-10 text-center">
            <p className="font-['Roboto'] text-sm text-destructive">{error}</p>
            <Button type="button" variant="secondary" className="mt-4 rounded-full font-['Roboto']" asChild>
              <Link to={listPath}>Quay lại danh sách</Link>
            </Button>
          </div>
        )}

        {!loading && notif && !error && (
          <article className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <div className="relative border-b border-border/60 bg-gradient-to-b from-muted/35 via-card to-card px-4 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary shadow-inner ring-4 ring-background">
                  <NotificationTypeIcon type={notif.type} className="size-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <time dateTime={notif.createdAt} className="font-['Roboto'] text-xs text-muted-foreground">
                      {formatDateTimeVN(notif.createdAt) || '—'}
                    </time>
                    {typeLabel ? (
                      <>
                        <span className="text-muted-foreground/70" aria-hidden>
                          ·
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-['Roboto'] text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {typeLabel}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h2 className="font-['Open_Sans'] text-lg font-semibold leading-snug text-foreground sm:text-[1.35rem]">{notif.title}</h2>
                  <p className="whitespace-pre-wrap pt-1 font-['Roboto'] text-[15px] leading-relaxed text-foreground/90 sm:text-base">
                    {notif.message}
                  </p>
                  {(notif.actionUrl || notif.link) && (
                    <div className="pt-4 pb-2">
                      <Button asChild>
                        <Link to={notif.actionUrl || notif.link}>
                          Xử lý ngay
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-border/50 bg-muted/15 px-4 py-3 sm:px-6">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span className="font-['Roboto'] text-xs text-muted-foreground">
                Đã xem
                {notif.readAt ? ` · ${formatDateTimeVN(notif.readAt)}` : ''}
              </span>
            </div>
          </article>
        )}

        {!loading && !notif && !error && (
          <p className="text-center font-['Roboto'] text-sm text-muted-foreground">Không có dữ liệu thông báo.</p>
        )}
      </div>
    </Layout>
  );
};

export default NotificationDetailPage;
