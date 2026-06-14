import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardList, Download, MessageSquareText, Eye } from 'lucide-react';

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
      submitted: 'Đang chờ nhà tuyển dụng phản hồi',
      under_review: 'Đơn đang chờ xét duyệt',
      shortlisted: 'Đơn đang chờ xét duyệt',
      interview_scheduled: 'Được mời phỏng vấn',
      interview_confirmed: 'Đã xác nhận lịch phỏng vấn',
      offer_extended: 'Đã nhận đề nghị công việc',
      offer_accepted: 'Đã chấp nhận đề nghị',
      offer_declined: 'Đã từ chối đề nghị',
      rejected: 'Đơn bị từ chối',
      withdrawn: 'Bạn đã rút đơn'
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
              <option value="submitted">Đã nộp</option>
              <option value="under_review">Chờ xét duyệt</option>
              <option value="interview_scheduled">Được mời phỏng vấn</option>
              <option value="interview_confirmed">Đã xác nhận lịch PV</option>
              <option value="interview_passed">Đã phỏng vấn xong</option>
              <option value="offer_extended">Đã gửi đề nghị</option>
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
                <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-muted/50">
                        <TableHead className="w-14 text-center font-['Roboto'] text-xs">STT</TableHead>
                        <TableHead className="font-['Roboto'] text-xs">Mã tuyển dụng</TableHead>
                        <TableHead className="font-['Roboto'] text-xs">Vị trí</TableHead>
                        <TableHead className="font-['Roboto'] text-xs">Địa điểm</TableHead>
                        <TableHead className="font-['Roboto'] text-xs">Ngày nộp</TableHead>
                        <TableHead className="font-['Roboto'] text-xs">Trạng thái</TableHead>
                        <TableHead className="text-left font-['Roboto'] text-xs">Thao tác</TableHead>
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
                            <TableCell className="text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                              {stt}
                            </TableCell>
                            <TableCell className="align-top">
                              <span className="font-mono text-xs font-medium text-foreground">{code || '—'}</span>
                            </TableCell>
                            <TableCell className="max-w-xs align-top">
                              <div className="font-['Open_Sans'] text-sm font-medium text-foreground">
                                {application.job?.title || '—'}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-['Roboto'] text-sm text-muted-foreground">
                              {application.job?.location || '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-['Roboto'] text-sm text-muted-foreground">
                              {application.createdAt ? formatDateVN(application.createdAt) : '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className={cn('font-normal', hrStatusBadgeClass(statusBadgeKey(application)))}>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Open_Sans'] text-left">Phản hồi từ nhà tuyển dụng</DialogTitle>
          </DialogHeader>
          <p className="max-h-[min(60vh,24rem)] overflow-y-auto font-['Roboto'] text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {feedbackText}
          </p>
        </DialogContent>
      </Dialog>
    </ApplicantLayout>
  );
};

export default ApplicationsPage;
