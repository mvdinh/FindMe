import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RecruiterLayout from '../layout/RecruiterLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../recruiterLayoutClasses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Briefcase, ClipboardList, Plus, UserCheck, CheckCircle2 } from 'lucide-react';
import { useApiRequest } from '../../hooks/useApiRequest';
import { formatDateVN } from "@/utils/dateFormat";
import { recruiterStatusBadgeClass, recruiterScoreTextClass } from '../recruiterTheme';
import { getInterviewPassFailLabel, getInterviewPassFailBadgeKey } from '../../utils/applicationStatusDisplay';
import { cn } from '@/lib/utils';
const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isCompanyApproved, setIsCompanyApproved] = useState(false);
  const [recentJobs, setRecentJobs] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [error, setError] = useState(null);
  const {
    makeJsonRequest
  } = useApiRequest();
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await makeJsonRequest('/api/recruiter/dashboard/stats');
      if (res && res.success !== false) {
        const stats = res.stats || res.data || res;
        setDashboardStats(stats);
      }
    } catch (err) {
      setError(prev => prev || 'Không tải được thống kê');
    } finally {
      setLoadingStats(false);
    }
  }, [makeJsonRequest]);
  const fetchRecentJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await makeJsonRequest('/api/recruiter/dashboard/recent-jobs');
      if (res && res.recentJobs) {
        setRecentJobs(res.recentJobs);
      }
    } catch (err) {
      setError(prev => prev || 'Không tải được danh sách tin gần đây');
    } finally {
      setLoadingJobs(false);
    }
  }, [makeJsonRequest]);
  const fetchRecentApplications = useCallback(async () => {
    setLoadingApplications(true);
    try {
      const res = await makeJsonRequest('/api/recruiter/dashboard/recent-applications');
      if (res && res.recentApplications) {
        setRecentApplications(res.recentApplications);
      }
    } catch (err) {
      setError(prev => prev || 'Không tải được danh sách hồ sơ gần đây');
    } finally {
      setLoadingApplications(false);
    }
  }, [makeJsonRequest]);
  const fetchCompanyStatus = useCallback(async () => {
    try {
      const compRes = await makeJsonRequest("/api/companies/me");
      if (compRes?.success && compRes.data?.verificationStatus === "approved") {
        setIsCompanyApproved(true);
      } else {
        setIsCompanyApproved(false);
      }
    } catch (_) {
      setIsCompanyApproved(false);
    }
  }, [makeJsonRequest]);
  useEffect(() => {
    fetchStats();
    fetchRecentJobs();
    fetchRecentApplications();
    fetchCompanyStatus();
  }, []);
  const getStatusLabel = status => {
    const s = (status || '').toString().trim().toLowerCase();
    const map = {
      active: 'Đang đăng tuyển',
      draft: 'Bản nháp',
      closed: 'Đã đóng',

      confirmed: 'Đã xác nhận',
      scheduled: 'Đã lên lịch',
      shortlisted: 'Chờ xét duyệt',
      under_review: 'Chờ xét duyệt',
      rejected: 'Từ chối',
      interview_scheduled: 'Đã mời phỏng vấn',
      interview_confirmed: 'Đã xác nhận lịch phỏng vấn',
      interview_passed: 'Đạt phỏng vấn',
      submitted: 'Đã nộp',
      offer_accepted: 'Nhận việc',
      offer_declined: 'Từ chối đề nghị',
      hired: 'Nhận việc',
      withdrawn: 'Ứng viên rút đơn',
      completed: 'Hoàn tất'
    };
    if (map[s]) return map[s];
    return s ? s.replaceAll('_', ' ') : '';
  };
  return (
    <RecruiterLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Tổng quan tuyển dụng</h1>
            <p className={HR_SUBTITLE}>Theo dõi tin đăng và hồ sơ ứng viên trên findme</p>
          </div>
          <div className={!isCompanyApproved ? "cursor-not-allowed" : ""}>
            <Button 
              className={`w-full min-h-11 touch-manipulation font-['Roboto'] sm:w-auto ${!isCompanyApproved ? "pointer-events-none" : ""}`} 
              disabled={!isCompanyApproved}
              onClick={(e) => {
                if (!isCompanyApproved) {
                  e.preventDefault();
                  return;
                }
                navigate("/recruiter/jobs/create");
              }}
            >
              <Plus className="size-5 shrink-0 mr-2" />
              Đăng tin tuyển dụng
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4 justify-center items-center">
          {loadingStats
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="shadow-sm h-full">
                  <CardContent className="flex items-center gap-4 p-6 h-full">
                    <Skeleton className="size-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : dashboardStats ? (
              <>
                <Card className="shadow-sm h-full">
                  <CardContent className="flex items-center gap-4 p-6 h-full">
                    <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
                      <Briefcase className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-['Roboto'] text-sm font-medium text-muted-foreground font-semibold">Tổng số tin đăng</p>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{dashboardStats.totalJobs ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm h-full">
                  <CardContent className="flex items-center gap-4 p-6 h-full">
                    <div className="rounded-lg bg-blue-500/10 p-3 ring-1 ring-blue-500/20">
                      <UserCheck className="size-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-['Roboto'] text-sm font-medium text-muted-foreground font-semibold">Tổng ứng viên</p>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{dashboardStats.totalApplicants ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm h-full">
                  <CardContent className="flex items-center gap-4 p-6 h-full">
                    <div className="rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-500/20">
                      <ClipboardList className="size-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-['Roboto'] text-sm font-medium text-muted-foreground font-semibold">Đã mời phỏng vấn</p>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                        {dashboardStats.candidatesInterviewScheduled ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm h-full">
                  <CardContent className="flex items-center gap-4 p-6 h-full">
                    <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20">
                      <CheckCircle2 className="size-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-['Roboto'] text-sm font-medium text-muted-foreground font-semibold">Phỏng vấn thành công</p>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                        {dashboardStats.candidatesInterviewPassed ?? 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="col-span-full text-sm text-destructive">Không tải được thống kê.</div>
            )}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
          <Card className="h-full shadow-sm">
            <CardHeader className="flex flex-col gap-2 border-b min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between sm:px-6">
              <CardTitle className="font-['Open_Sans'] text-base sm:text-lg">Tin tuyển dụng mới nhất</CardTitle>
              <Button variant="link" className="h-auto shrink-0 p-0 font-['Roboto'] text-primary" asChild>
                <Link to="/recruiter/jobs">Xem tất cả →</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {loadingJobs
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))
                  : recentJobs.length === 0
                    ? <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        Chưa có tin tuyển dụng gần đây.
                        <div className="mt-2">
                          <Link to="/recruiter/jobs/create" className="text-primary underline">
                            Đăng tin đầu tiên
                          </Link>
                        </div>
                      </div>
                    : recentJobs.slice(0, 3).map((job, index) => (
                        <div
                          key={job._id || job.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex w-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium tabular-nums text-muted-foreground font-['Roboto']">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-['Open_Sans'] text-sm font-medium text-foreground">{job.title}</h3>
                              <Badge variant="outline" className={cn('font-normal', recruiterStatusBadgeClass(job.status))}>
                                {getStatusLabel(job.status)}
                              </Badge>
                            </div>
                            <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">
                              {job.department || job.category || 'Chung'} • {job.applicants || job.applicantsCount || 0} ứng viên
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-['Roboto'] text-xs text-muted-foreground">
                              {job.postedDate ? formatDateVN(job.postedDate) : ''}
                            </p>
                          </div>
                        </div>
                      ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full overflow-hidden shadow-sm">
            <CardHeader className="flex flex-col gap-2 border-b min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between sm:px-6">
              <CardTitle className="font-['Open_Sans'] text-base sm:text-lg">Hồ sơ ứng viên mới nhất</CardTitle>
              <Button variant="link" className="h-auto shrink-0 p-0 font-['Roboto'] text-primary" asChild>
                <Link to="/recruiter/applications">Xem tất cả →</Link>
              </Button>
            </CardHeader>
            <div className="flex-1 flex flex-col thin-scrollbar [&_[data-slot=table-container]]:flex-1 [&_[data-slot=table-container]]:flex [&_[data-slot=table-container]]:flex-col [&_[data-slot=table-container]]:justify-between">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center font-['Roboto'] text-xs">STT</TableHead>
                    <TableHead className="font-['Roboto'] text-xs">Ứng viên</TableHead>
                    <TableHead className="font-['Roboto'] text-xs">Vị trí</TableHead>
                    <TableHead className="font-['Roboto'] text-xs">Ngày nộp</TableHead>
                    <TableHead className="font-['Roboto'] text-xs">Điểm hồ sơ</TableHead>
                    <TableHead className="font-['Roboto'] text-xs">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingApplications ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8">
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : recentApplications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Chưa có hồ sơ gần đây.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentApplications.map((application, rowIndex) => (
                      <TableRow key={application._id || application.id}>
                        <TableCell className="text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                          {rowIndex + 1}
                        </TableCell>
                        <TableCell className="font-['Open_Sans'] text-sm font-medium text-foreground">
                          {application.candidate || application.candidateName || 'Ứng viên'}
                        </TableCell>
                        <TableCell className="font-['Roboto'] text-sm text-foreground">
                          {application.job || application.jobTitle || 'Vị trí tuyển dụng'}
                        </TableCell>
                        <TableCell className="font-['Roboto'] text-sm text-muted-foreground">
                          {application.appliedDate ? formatDateVN(application.appliedDate) : ''}
                        </TableCell>
                        <TableCell className={cn("font-['Roboto'] text-sm", recruiterScoreTextClass(application.resumeScore))}>
                          {application.resumeScore != null ? `${Number(application.resumeScore).toFixed(1)}/10` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-normal',
                              recruiterStatusBadgeClass(getInterviewPassFailBadgeKey(application) ?? application.status)
                            )}
                          >
                            {getInterviewPassFailLabel(application) ?? getStatusLabel(application.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {error && (
            <Alert variant="destructive" className="col-span-full mt-2 lg:col-span-2">
              <AlertCircle />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2 font-['Roboto']">
                <span>{error}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-destructive/50"
                  onClick={() => {
                    setError(null);
                    fetchStats();
                    fetchRecentJobs();
                    fetchRecentApplications();
                  }}
                >
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="col-span-full mt-2 lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="font-['Open_Sans'] text-lg">Thao tác nhanh</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div
                  className={`group flex min-h-[52px] touch-manipulation items-center rounded-lg border border-border p-4 transition-colors ${!isCompanyApproved ? "cursor-not-allowed opacity-50" : "hover:border-primary/30 hover:bg-muted/50 cursor-pointer"}`}
                  onClick={() => {
                    if (isCompanyApproved) navigate("/recruiter/jobs/create");
                  }}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-colors group-hover:bg-primary/15">
                    <Plus className="size-5 text-primary" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-['Open_Sans'] text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      Đăng tin tuyển dụng
                    </h3>
                    <p className="font-['Roboto'] text-xs text-muted-foreground">Tạo tin mới trên findme</p>
                  </div>
                </div>
                <Link
                  to="/recruiter/applications"
                  className="group flex min-h-[52px] touch-manipulation items-center rounded-lg border border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/50"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 transition-colors group-hover:bg-primary/15">
                    <ClipboardList className="size-5 text-primary" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-['Open_Sans'] text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      Hồ sơ ứng viên
                    </h3>
                    <p className="font-['Roboto'] text-xs text-muted-foreground">Xem và cập nhật tiến độ</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
};
export default RecruiterDashboard;




