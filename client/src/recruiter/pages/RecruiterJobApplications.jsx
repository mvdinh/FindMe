import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApiRequest } from '../../hooks/useApiRequest';
import { recruiterStatusBadgeClass } from '../recruiterTheme';
import RecruiterLayout from '../layout/RecruiterLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../recruiterLayoutClasses';
import Pagination from '@/components/common/Pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Eye, FileText, Loader2, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getInterviewPassFailLabel, getInterviewPassFailBadgeKey } from '../../utils/applicationStatusDisplay';
import { formatDateVN } from "@/utils/dateFormat";

const RecruiterJobApplications = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { makeJsonRequest } = useApiRequest();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalApplications: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [stats, setStats] = useState(null);
  const busy = loading;
  const lastFetchedJobIdRef = useRef(null);
  const skipNextListFetchRef = useRef(false);
  const jobStatusLabels = {
    active: 'Đang đăng tuyển',
    draft: 'Bản nháp',
    closed: 'Đã đóng',
    archived: 'Lưu trữ'
  };
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    (async () => {
      try {
        const jobResponse = await makeJsonRequest(`/api/recruiter/jobs/${jobId}`);
        if (!cancelled && jobResponse.success) {
          setJob(jobResponse.data);
        }
      } catch (err) {
        if (!cancelled) console.error('Error fetching job:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, makeJsonRequest]);

  const fetchApplicationsPage = useCallback(
    async (page = 1) => {
      if (!jobId) return;
      try {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams({ page: String(page), limit: '20' });
        const appsResponse = await makeJsonRequest(`/api/recruiter/jobs/${jobId}/applications?${qs}`);
        if (appsResponse.success && appsResponse.data) {
          setApplications(appsResponse.data.applications || []);
          const p = appsResponse.data.pagination;
          if (p) {
            setPagination({
              currentPage: p.currentPage ?? page,
              totalPages: Math.max(1, p.totalPages ?? 1),
              totalApplications: p.totalApplications ?? 0,
              limit: p.limit ?? 20,
              hasNextPage: !!p.hasNextPage,
              hasPrevPage: !!p.hasPrevPage
            });
          }
          setStats(appsResponse.data.stats ?? null);
        } else {
          throw new Error(appsResponse.message || 'Không tải được danh sách hồ sơ');
        }
      } catch (err) {
        console.error('Error fetching job applications:', err);
        setError(err.message || 'Không thể tải danh sách hồ sơ');
        setApplications([]);
      } finally {
        setLoading(false);
      }
    },
    [jobId, makeJsonRequest]
  );

  useEffect(() => {
    if (!jobId) return;
    if (lastFetchedJobIdRef.current !== jobId) {
      lastFetchedJobIdRef.current = jobId;
      skipNextListFetchRef.current = true;
      setCurrentPage(1);
      fetchApplicationsPage(1);
      return;
    }
    if (skipNextListFetchRef.current) {
      skipNextListFetchRef.current = false;
      return;
    }
    fetchApplicationsPage(currentPage);
  }, [jobId, currentPage, fetchApplicationsPage]);

  const getApplicationStatusLabelFromStatus = status => {
    const s = (status || '').toString().toLowerCase();
    const map = {
      submitted: 'Đã nộp',
      under_review: 'Chờ xét duyệt',
      shortlisted: 'Chờ xét duyệt',
      interview_scheduled: 'Đã mời phỏng vấn',
      interview_confirmed: 'Đã xác nhận lịch phỏng vấn',
      interview_passed: 'Đạt phỏng vấn',
      rejected: 'Từ chối',
      offer_accepted: 'Nhận việc',
      withdrawn: 'Ứng viên rút đơn'
    };
    return map[s] || (s ? s.replaceAll('_', ' ') : 'Đã nộp');
  };

  if (loading && applications.length === 0) {
    return (
      <RecruiterLayout>
        <div className={HR_PAGE}>
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <span className="ml-3 font-['Roboto'] text-muted-foreground">Đang tải hồ sơ...</span>
          </div>
        </div>
      </RecruiterLayout>
    );
  }

  if (error) {
    return (
      <RecruiterLayout>
        <div className={HR_PAGE}>
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" className="mt-4 font-['Roboto']" onClick={() => navigate('/recruiter/jobs')}>
            Quay lại danh sách tin
          </Button>
        </div>
      </RecruiterLayout>
    );
  }

  const total = stats?.totalApplications ?? pagination.totalApplications ?? 0;
  const interviewCount = stats?.interviewScheduled ?? 0;
  const reviewCount = stats?.underReview ?? 0;
  const rejectedCount = stats?.rejected ?? 0;
  const pageLimit = pagination.limit || 20;
  return (
    <RecruiterLayout>
      <div className={HR_PAGE}>
        <div aria-busy={busy}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={cn(HR_H1, 'break-words')}>Hồ sơ ứng viên · {job?.title || 'vị trí tuyển dụng'}</h1>
            <p className={HR_SUBTITLE}>Theo dõi và xử lý hồ sơ nộp cho tin đăng này trên findme</p>
          </div>
          <div className="flex w-full flex-col gap-2 min-[480px]:flex-row min-[480px]:flex-wrap sm:w-auto sm:justify-end">
            <Button variant="outline" className="min-h-11 w-full touch-manipulation font-['Roboto'] min-[480px]:w-auto" asChild disabled={busy}>
              <Link to={`/recruiter/jobs/${jobId}/edit`} tabIndex={busy ? -1 : undefined} aria-hidden={busy} className="inline-flex items-center gap-2">
                <Pencil className="size-4 shrink-0" />
                Sửa tin
              </Link>
            </Button>
            <Button className="min-h-11 w-full touch-manipulation font-['Roboto'] min-[480px]:w-auto" onClick={() => navigate('/recruiter/jobs')} disabled={busy}>
              <ArrowLeft className="size-4 shrink-0" />
              Quay lại danh sách
            </Button>
          </div>
        </div>

        {job && (
          <Card className="mt-4 shadow-sm sm:mt-6">
            <CardContent className="grid grid-cols-1 gap-4 pt-6 text-sm md:grid-cols-4">
              <div>
                <span className="font-medium text-foreground">Phòng ban:</span>
                <span className="ml-2 text-muted-foreground">{job.department}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Loại:</span>
                <span className="ml-2 text-muted-foreground">{job.jobType}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Địa điểm:</span>
                <span className="ml-2 text-muted-foreground">{job.location}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">Trạng thái:</span>
                <Badge variant="outline" className={cn('font-normal', recruiterStatusBadgeClass(job.status))}>
                  {jobStatusLabels[job.status] || job.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-6 md:grid-cols-4 md:gap-4">
          <Card className="shadow-sm ring-1 ring-primary/15">
            <CardContent className="pt-6">
              <p className="font-['Open_Sans'] text-2xl font-bold text-primary">{total}</p>
              <p className="font-['Roboto'] text-sm text-muted-foreground">Tổng hồ sơ</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="font-['Open_Sans'] text-2xl font-bold text-primary">{interviewCount}</p>
              <p className="font-['Roboto'] text-sm text-muted-foreground">Mời phỏng vấn</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{reviewCount}</p>
              <p className="font-['Roboto'] text-sm text-muted-foreground">Chờ xét duyệt</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="font-['Open_Sans'] text-2xl font-bold text-primary">{rejectedCount}</p>
              <p className="font-['Roboto'] text-sm text-muted-foreground">Từ chối</p>
            </CardContent>
          </Card>
        </div>

        {Array.isArray(applications) && applications.length > 0 && (
          <Card className="mb-6 shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <h3 className="font-['Open_Sans'] text-lg font-medium text-foreground">Thao tác nhanh</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="font-['Roboto']" type="button" disabled={busy}>
                  Sơ tuyển hàng loạt
                </Button>
                <Button variant="secondary" size="sm" className="font-['Roboto']" type="button" disabled={busy}>
                  Xuất danh sách
                </Button>
                <Button size="sm" className="font-['Roboto']" asChild disabled={busy}>
                  <Link to={`/recruiter/applications?jobId=${jobId}`} tabIndex={busy ? -1 : undefined} aria-hidden={busy}>
                    Xem nâng cao
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm">
          {!loading && total === 0 ? (
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto size-12 text-muted-foreground" aria-hidden />
              <h3 className="mt-2 font-['Open_Sans'] text-sm font-medium text-foreground">Chưa có hồ sơ</h3>
              <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">
                Hồ sơ nộp cho tin này sẽ hiển thị khi ứng viên gửi đơn.
              </p>
              <p className="mt-4 font-['Roboto'] text-sm text-muted-foreground">
                Đảm bảo tin tuyển dụng đã được đăng và hiển thị cho ứng viên.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button variant="outline" asChild disabled={busy}>
                  <Link to={`/recruiter/jobs/${jobId}/edit`} tabIndex={busy ? -1 : undefined} aria-hidden={busy}>
                    Chỉnh sửa tin
                  </Link>
                </Button>
                <Button asChild disabled={busy}>
                  <Link to="/recruiter/jobs" tabIndex={busy ? -1 : undefined} aria-hidden={busy}>
                    Quay lại tin tuyển dụng
                  </Link>
                </Button>
              </div>
            </CardContent>
          ) : (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-['Roboto'] text-xs">Ứng viên</TableHead>
                    <TableHead className="font-['Roboto'] text-xs">Ngày nộp</TableHead>
                    <TableHead className="font-['Roboto'] text-xs">Trạng thái</TableHead>
                    <TableHead className="text-right font-['Roboto'] text-xs">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(applications || []).map((application, index) => {
                    const applicantName =
                      application.candidateName ||
                      [application.applicant?.firstName, application.applicant?.lastName].filter(Boolean).join(' ') ||
                      application.applicant?.name ||
                      'Ứng viên';
                    return (
                    <TableRow key={application._id || application.id || index}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-['Open_Sans'] text-sm font-medium text-foreground">
                            {applicantName}
                          </div>
                          <div className="font-['Roboto'] text-sm text-muted-foreground">
                            {application.applicant?.email || 'Chưa có email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-['Roboto'] text-sm text-foreground">
                          {formatDateVN(application.createdAt || Date.now()) || '—'}
                        </div>
                        <div className="font-['Roboto'] text-sm text-muted-foreground">
                          {new Date(application.createdAt || Date.now()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-normal',
                            recruiterStatusBadgeClass(getInterviewPassFailBadgeKey(application) ?? application.status)
                          )}
                        >
                          {getInterviewPassFailLabel(application) ?? getApplicationStatusLabelFromStatus(application.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="size-8" type="button" title="Xem chi tiết" disabled={busy}>
                            <span className="sr-only">Xem chi tiết</span>
                            <Eye className="size-4" aria-hidden />
                          </Button>
                          {application.status === 'under_review' && (
                            <>
                              <Button variant="ghost" size="icon" className="size-8 text-primary" type="button" title="Sơ tuyển" disabled={busy}>
                                <span className="sr-only">Sơ tuyển</span>
                                <CheckCircle2 className="size-4" aria-hidden />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-8 text-primary" type="button" title="Từ chối" disabled={busy}>
                                <span className="sr-only">Từ chối</span>
                                <X className="size-4" aria-hidden />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setCurrentPage(p)}
              loading={loading}
              totalItems={pagination.totalApplications}
              limit={pageLimit}
              itemLabel="hồ sơ"
            />
            </>
          )}
        </Card>
      </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterJobApplications;
