import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ApplicantLayout from '../layout/ApplicantLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../applicantLayoutClasses';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const ConfirmInterviewPage = () => {
  const [searchParams] = useSearchParams();
  const applicationId = searchParams.get('applicationId') || '';
  const { apiRequest } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!applicationId) {
        setError('Thiếu thông tin đơn ứng tuyển. Vui lòng mở liên kết từ thông báo hoặc từ danh sách đơn.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await apiRequest(
          `/api/applicant/applications/confirm-interview/preview?applicationId=${encodeURIComponent(applicationId)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Không tải được thông tin lịch phỏng vấn.');
        }
        if (!cancelled && data.success && data.data) {
          setPreview(data.data);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Không tải được dữ liệu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [applicationId, apiRequest]);

  /** Cùng kiểu ngày/giờ VN với ghi chú HR (dd/mm/yyyy lúc HH:mm, múi Asia/Ho_Chi_Minh). */
  const formatWhen = v => {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '—';
    const s = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
    return s.replace(',', ' lúc');
  };

  const handleConfirm = async () => {
    if (!applicationId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiRequest('/api/applicant/applications/confirm-interview', {
        method: 'POST',
        body: JSON.stringify({ applicationId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Xác nhận thất bại.');
      }
      setDone(true);
    } catch (e) {
      setError(e.message || 'Xác nhận thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ApplicantLayout>
      <div className={`${HR_PAGE} max-w-lg`}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Xác nhận lịch phỏng vấn</h1>
            <p className={HR_SUBTITLE}>Vui lòng kiểm tra thông tin trước khi xác nhận.</p>
          </div>
        </div>

        {loading && (
          <Card className="shadow-sm">
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="size-4" />
            <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && done && (
          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <CheckCircle2 className="mx-auto size-10 text-primary" />
              <p className="font-['Roboto'] text-foreground">
                Bạn đã xác nhận lịch phỏng vấn. Trạng thái đơn đã được cập nhật cho bạn và nhà tuyển dụng.
              </p>
              <Button className="min-h-11 w-full touch-manipulation font-['Roboto'] sm:w-auto" asChild>
                <Link to="/applicant/applications">Về danh sách đơn ứng tuyển</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && preview && !done && (
          <Card className="shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="font-['Open_Sans'] text-lg font-semibold text-foreground">{preview.jobTitle || 'Vị trí ứng tuyển'}</h2>
                <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">
                  Mã tuyển dụng:{' '}
                  <span className="font-mono font-medium text-foreground">{preview.recruitmentCode || '-'}</span>
                </p>
                {preview.companyName ? (
                  <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">{preview.companyName}</p>
                ) : null}
              </div>
              <dl className="space-y-3 font-['Roboto'] text-sm">
                <div>
                  <dt className="text-muted-foreground">Thời gian phỏng vấn</dt>
                  <dd className="mt-0.5 text-foreground">{formatWhen(preview.scheduledAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Địa điểm theo tin tuyển dụng</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{preview.jobAddressLine || '—'}</dd>
                </div>
                {preview.venueOrLink ? (
                  <div>
                    <dt className="text-muted-foreground">Địa điểm / link phỏng vấn</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{preview.venueOrLink}</dd>
                  </div>
                ) : null}
                {preview.hrNote ? (
                  <div>
                    <dt className="text-muted-foreground">Ghi chú từ nhà tuyển dụng</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{preview.hrNote}</dd>
                  </div>
                ) : null}
              </dl>
              <Button
                type="button"
                className="mt-2 w-full min-h-11 touch-manipulation font-['Roboto']"
                disabled={submitting}
                onClick={handleConfirm}
              >
                {submitting ? 'Đang xác nhận…' : 'Xác nhận lịch phỏng vấn'}
              </Button>
              <Button variant="link" className="h-auto w-full font-['Roboto'] text-muted-foreground" asChild>
                <Link to="/applicant/applications">Quay lại không xác nhận</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ApplicantLayout>
  );
};

export default ConfirmInterviewPage;
