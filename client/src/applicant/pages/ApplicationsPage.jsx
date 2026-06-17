import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ApplicantLayout from '../layout/ApplicantLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE, HR_TABLE_WRAP } from '../applicantLayoutClasses';
import { HR_INPUT } from '../applicantFormClasses';
import { SkeletonTable } from '../../components/common/Skeleton';
import { formatDateVN } from "@/utils/dateFormat";
import { hrStatusBadgeClass } from '../applicantTheme';
import { useAuth } from '../../contexts/AuthContext';
import { getRecruitmentCode } from '../../utils/recruitmentCode';
import {
  getInterviewPassFailLabel,
  getInterviewPassFailBadgeKey,
  isPostInterviewRejection
} from '../../utils/applicationStatusDisplay';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Download, MessageSquareText, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { useToast } from '../../contexts/ToastContext';

const PAGE_LIMIT = 10;

const ApplicationsPage = () => {
  const { apiRequest } = useAuth();
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('Phản hồi từ nhà tuyển dụng');

  const [searchParams] = useSearchParams();
  const showFeedbackAppId = searchParams.get('showFeedback');

  const openApplicationResume = async applicationId => {
    if (!applicationId) return;
    try {
      const response = await apiRequest(`/api/applicant/applications/${encodeURIComponent(applicationId)}/resume`);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        return;
      }
      let msg = 'Không thể mở hồ sơ đã ứng tuyển. Vui lòng thử lại.';
      try {
        const data = await response.json();
        if (data?.message) msg = data.message;
      } catch {}
      toast.error(msg);
    } catch (error) {
      console.error('Error opening application resume:', error);
      toast.error('Mở hồ sơ bị lỗi. Vui lòng thử lại.');
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [currentPage, statusFilter]);

  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: PAGE_LIMIT
      });
      if (statusFilter) params.append('status', statusFilter);
      const response = await apiRequest(`/api/applicant/applications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
        setPagination(data.pagination || {});
      } else {
        console.error('Failed to fetch applications:', response.status);
        setApplications([]);
        setPagination({});
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadgeKey = application => getInterviewPassFailBadgeKey(application) ?? application?.status ?? '';

  const getStatusText = application => {
    if (!application) return '';
    if (['queued', 'processing'].includes(application?.aiProcessing?.status)) return 'AI đang phân loại hồ sơ';
    const passFail = getInterviewPassFailLabel(application);
    if (passFail) return passFail;
    const status = application.status;
    const texts = {
      submitted: 'Chờ phản hồi',
      under_review: 'Chờ xét duyệt',
      shortlisted: 'Chờ xét duyệt',
      interview_scheduled: 'Mời phỏng vấn',
      interview_confirmed: 'Xác nhận PV',
      offer_extended: 'Đề nghị việc làm',
      offer_accepted: 'Phỏng vấn',
      offer_declined: 'Từ chối đề nghị',
      rejected: 'Bị từ chối',
      withdrawn: 'Đã rút đơn'
    };
    return texts[status] || status;
  };

  const getPassInterviewReason = application => {
    if (application?.status !== 'interview_passed') return '';
    const timeline = Array.isArray(application?.timeline) ? application.timeline : [];
    const latestPassed = [...timeline].reverse().find(item => item?.status === 'interview_passed' && (item?.note || item?.notes));
    const fromTimeline = latestPassed?.note || latestPassed?.notes || '';
    if (fromTimeline) return fromTimeline;
    const notes = Array.isArray(application?.notes) ? application.notes : [];
    const latestVisibleNote = [...notes].reverse().find(item => !item?.isPrivate && (item?.text || item?.content));
    return latestVisibleNote?.text || latestVisibleNote?.content || '';
  };

  const getRejectionReason = application => {
    if (application?.status !== 'rejected') return '';
    const timeline = Array.isArray(application?.timeline) ? application.timeline : [];
    const latestRejectedTimeline = [...timeline].reverse().find(item => item?.status === 'rejected' && (item?.note || item?.notes));
    const timelineReason = latestRejectedTimeline?.note || latestRejectedTimeline?.notes || '';
    if (timelineReason) return timelineReason;
    const notes = Array.isArray(application?.notes) ? application.notes : [];
    const latestVisibleNote = [...notes].reverse().find(item => !item?.isPrivate && (item?.text || item?.content));
    return latestVisibleNote?.text || latestVisibleNote?.content || '';
  };

  const openEmployerFeedback = (title, body) => {
    setFeedbackTitle(title);
    setFeedbackText(body);
    setFeedbackOpen(true);
  };

  const triggerFeedbackModal = (app) => {
    if (!app) return;
    if (app.status === 'rejected') {
      const detail = (getRejectionReason(app) || '').trim();
      const postInterviewFail = isPostInterviewRejection(app);
      const title = postInterviewFail ? 'Kết quả phỏng vấn — Không đạt' : 'Phản hồi từ nhà tuyển dụng';
      const body = detail || 'Nhà tuyển dụng chưa để lại nội dung chi tiết trên hệ thống. Bạn có thể xem thông báo trong mục thông báo nếu có.';
      openEmployerFeedback(title, body);
    } else if (app.status === 'interview_passed') {
      const detail = (getPassInterviewReason(app) || '').trim();
      const title = 'Kết quả phỏng vấn — Đạt';
      const body = detail || 'Nhà tuyển dụng chưa để lại nội dung chi tiết trên hệ thống. Bạn có thể xem thông báo trong mục thông báo nếu có.';
      openEmployerFeedback(title, body);
    } else {
      const notes = Array.isArray(app.notes) ? app.notes : [];
      const latestVisibleNote = [...notes].reverse().find(item => !item?.isPrivate && (item?.text || item?.content));
      const body = latestVisibleNote?.text || latestVisibleNote?.content || '';
      if (body) {
        openEmployerFeedback('Thông tin phản hồi', body.trim());
      }
    }
  };

  const clearShowFeedbackParam = () => {
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete('showFeedback');
    const newSearch = newParams.toString();
    const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : '');
    window.history.replaceState(null, '', newPath);
  };

  useEffect(() => {
    if (!showFeedbackAppId || isLoading) return;

    const checkAndShowFeedback = async () => {
      const app = applications.find(a => a._id === showFeedbackAppId);
      if (app) {
        triggerFeedbackModal(app);
        clearShowFeedbackParam();
      } else {
        try {
          const response = await apiRequest(`/api/applicant/applications/${encodeURIComponent(showFeedbackAppId)}`);
          if (response.ok) {
            const data = await response.json();
            if (data?.application) {
              triggerFeedbackModal(data.application);
            }
          }
        } catch (err) {
          console.error('Error fetching application for feedback:', err);
        } finally {
          clearShowFeedbackParam();
        }
      }
    };

    checkAndShowFeedback();
  }, [showFeedbackAppId, isLoading, applications]);

  const statusFilterLabel = raw => {
    const labels = {
      submitted: 'Đã nộp',
      under_review: 'Chờ xét duyệt',
      interview_scheduled: 'Được mời phỏng vấn',
      interview_confirmed: 'Đã xác nhận lịch PV',
      interview_passed: 'Đạt phỏng vấn',
      offer_extended: 'Đã gửi đề nghị',
      rejected: 'Bị từ chối / không đạt PV'
    };
    return labels[raw] || raw || '';
  };

  const pageLimit = pagination.limit || PAGE_LIMIT;

  if (isLoading) {
    return (
      <ApplicantLayout>
        <div className={HR_PAGE}>
          <div className={HR_PAGE_HEADER}>
            <div className="min-w-0 flex-1">
              <h1 className={HR_H1}>Đơn ứng tuyển của tôi</h1>
              <p className={HR_SUBTITLE}>Theo dõi trạng thái và tiến trình các đơn ứng tuyển</p>
            </div>
          </div>
          <SkeletonTable rows={10} columns={7} />
        </div>
      </ApplicantLayout>
    );
  }

  return (
    <ApplicantLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Đơn ứng tuyển của tôi</h1>
            <p className={HR_SUBTITLE}>Theo dõi trạng thái và tiến trình các đơn ứng tuyển</p>
          </div>
          <div className="w-full shrink-0 sm:w-auto">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={HR_INPUT}
            >
              <option value="">Tất cả đơn ứng tuyển</option>
              <option value="submitted">Chờ phản hồi</option>
              <option value="under_review">Chờ xét duyệt</option>
              <option value="interview_scheduled">Mời phỏng vấn</option>
              <option value="interview_confirmed">Xác nhận PV</option>
              <option value="interview_passed">Đã PV xong</option>
              <option value="offer_extended">Đề nghị việc làm</option>
              <option value="offer_accepted">Phỏng vấn</option>
              <option value="rejected">Bị từ chối</option>
            </select>
          </div>
        </div>

        {applications.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <ClipboardList className="mx-auto mb-4 size-12 text-muted-foreground" />
              <h3 className="mb-2 font-['Open_Sans'] text-lg font-medium text-foreground">Không tìm thấy đơn ứng tuyển</h3>
              <p className="mb-6 font-['Roboto'] text-muted-foreground">
                {statusFilter
                  ? `Không có đơn ứng tuyển với trạng thái "${statusFilterLabel(statusFilter)}".`
                  : 'Bạn chưa ứng tuyển việc làm nào. Hãy bắt đầu tìm kiếm cơ hội!'}
              </p>
              <Button className="min-h-11 touch-manipulation font-['Roboto']" asChild>
                <Link to="/jobs">Duyệt việc làm</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className={HR_TABLE_WRAP}>
              <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] thin-scrollbar">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-muted/50">
                        <TableHead className="w-16 text-center font-['Roboto'] text-base font-semibold text-gray-900">STT</TableHead>
                        <TableHead className="font-['Roboto'] text-base font-semibold text-gray-900">Việc làm</TableHead>
                        <TableHead className="font-['Roboto'] text-base font-semibold text-gray-900">Địa điểm</TableHead>
                        <TableHead className="font-['Roboto'] text-base font-semibold text-gray-900">Ngày nộp</TableHead>
                        <TableHead className="font-['Roboto'] text-base font-semibold text-gray-900">Trạng thái</TableHead>
                        <TableHead className="text-left font-['Roboto'] text-base font-semibold text-gray-900">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((application, rowIndex) => {
                        const stt = (currentPage - 1) * pageLimit + rowIndex + 1;
                        const code = application.recruitmentCode || getRecruitmentCode(application.job);
                        const rejectionReason = getRejectionReason(application);
                        const passReason = getPassInterviewReason(application);
                        const postInterviewFail = isPostInterviewRejection(application);
                        const showConfirmInterview = application.status === 'interview_scheduled' && application._id;
                        const showRejectFeedback =
                          application.status === 'rejected' && (rejectionReason || postInterviewFail);
                        const showPassFeedback = application.status === 'interview_passed';
                        const canViewResume = Boolean(application?._id);
                        return (
                          <TableRow key={application._id}>
                            <TableCell className="text-center font-['Roboto'] text-base tabular-nums text-muted-foreground">
                              {stt}
                            </TableCell>
                            <TableCell className="max-w-xs align-top">
                              <div className="font-['Open_Sans'] text-[17px] font-medium text-foreground truncate" title={application.job?.title || ''}>
                                {application.job?.title || '—'}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-['Roboto'] text-base text-muted-foreground">
                              {application.job?.location || '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-['Roboto'] text-base text-muted-foreground">
                              {application.createdAt ? formatDateVN(application.createdAt) : '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className={cn('font-normal text-sm px-3 py-1', hrStatusBadgeClass(statusBadgeKey(application)))}>
                                {getStatusText(application)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex flex-nowrap items-center justify-start gap-2">
                                {application.job?._id && (
                                  <Button variant="outline" size="sm" className="gap-1.5 font-['Roboto'] whitespace-nowrap" asChild>
                                    <Link to={`/jobs/${application.job._id}`} title="Xem chi tiết việc làm">
                                      <Eye className="size-3.5 shrink-0" aria-hidden />
                                      Xem việc làm
                                    </Link>
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 font-['Roboto']"
                                  disabled={!canViewResume}
                                  onClick={() => openApplicationResume(application._id)}
                                  title={!canViewResume ? 'Không có hồ sơ' : 'Xem hồ sơ (CV) đã nộp'}
                                >
                                  <Download className="size-3.5 shrink-0" aria-hidden />
                                  Xem hồ sơ
                                </Button>
                                {showConfirmInterview ? (
                                  <Button variant="default" size="sm" className="font-['Roboto']" asChild>
                                    <Link
                                      to={`/applicant/confirm-interview?applicationId=${encodeURIComponent(application._id)}`}
                                    >
                                      Xác nhận lịch PV
                                    </Link>
                                  </Button>
                                ) : null}
                                {showPassFeedback ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 font-['Roboto']"
                                    onClick={() => {
                                      const detail = (passReason || '').trim();
                                      openEmployerFeedback(
                                        'Kết quả phỏng vấn — Đạt',
                                        detail ||
                                          'Nhà tuyển dụng chưa để lại nội dung chi tiết trên hệ thống. Bạn có thể xem thông báo trong mục thông báo nếu có.'
                                      );
                                    }}
                                  >
                                    <MessageSquareText className="size-3.5 shrink-0" aria-hidden />
                                    Xem lý do / phản hồi
                                  </Button>
                                ) : null}
                                {showRejectFeedback ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 font-['Roboto']"
                                    onClick={() => {
                                      const detail = (rejectionReason || '').trim();
                                      openEmployerFeedback(
                                        postInterviewFail ? 'Kết quả phỏng vấn — Không đạt' : 'Phản hồi từ nhà tuyển dụng',
                                        detail ||
                                          'Nhà tuyển dụng chưa để lại nội dung chi tiết trên hệ thống. Bạn có thể xem thông báo trong mục thông báo nếu có.'
                                      );
                                    }}
                                  >
                                    <MessageSquareText className="size-3.5 shrink-0" aria-hidden />
                                    Xem lý do / phản hồi
                                  </Button>
                                ) : null}
                                {!showConfirmInterview && !showPassFeedback && !showRejectFeedback ? (
                                  <span className="font-['Roboto'] text-xs text-muted-foreground">—</span>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-['Roboto'] text-sm text-muted-foreground">
                  Hiển thị{' '}
                  <span className="font-medium text-foreground">{(currentPage - 1) * pageLimit + 1}</span> –{' '}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * pageLimit, pagination.totalApplications)}
                  </span>{' '}
                  / {pagination.totalApplications} đơn
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-['Roboto']"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={!pagination.hasPrevPage}
                  >
                    Trước
                  </Button>
                  <span className="px-2 font-['Roboto'] text-sm font-medium text-foreground">
                    Trang {currentPage}/{pagination.totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-['Roboto']"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, pagination.totalPages))}
                    disabled={!pagination.hasNextPage}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md !p-0 !gap-0 rounded-2xl border-none shadow-2xl overflow-hidden bg-card">
          {(() => {
            const titleLower = (feedbackTitle || '').toLowerCase();
            const type = titleLower.includes('đạt') && !titleLower.includes('không đạt')
              ? 'pass'
              : (titleLower.includes('không đạt') || titleLower.includes('từ chối') || titleLower.includes('sàng lọc') || titleLower.includes('ats')
                ? 'fail'
                : 'info');

            return (
              <>
                <div className={cn(
                  "p-6 pb-5 flex items-start gap-4 border-b",
                  type === 'pass' && "bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-100/50 dark:border-emerald-950/50",
                  type === 'fail' && "bg-gradient-to-r from-rose-50 to-orange-50/50 dark:from-rose-950/20 dark:to-orange-950/10 border-rose-100/50 dark:border-rose-950/50",
                  type === 'info' && "bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-100/50 dark:border-blue-950/50"
                )}>
                  {type === 'pass' && (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="size-5" />
                    </div>
                  )}
                  {type === 'fail' && (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                      <AlertTriangle className="size-5" />
                    </div>
                  )}
                  {type === 'info' && (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                      <MessageSquareText className="size-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-6">
                    <DialogTitle className="font-['Open_Sans'] text-lg font-semibold text-foreground leading-tight tracking-tight">
                      {feedbackTitle}
                    </DialogTitle>
                    <p className="text-[11px] font-['Roboto'] font-medium text-muted-foreground/80 mt-1 uppercase tracking-wider">
                      Phản hồi từ hệ thống FindMe
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/40 p-5 shadow-inner">
                    <p className="max-h-[min(40vh,16rem)] overflow-y-auto font-['Roboto'] text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90 pr-2 thin-scrollbar">
                      {feedbackText}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10 px-6 rounded-lg font-['Roboto'] font-semibold text-sm transition-all hover:bg-muted active:scale-[0.98]"
                      onClick={() => setFeedbackOpen(false)}
                    >
                      Đóng
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </ApplicantLayout>
  );
};

export default ApplicationsPage;
