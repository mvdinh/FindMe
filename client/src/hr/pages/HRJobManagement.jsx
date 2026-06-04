import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import HRLayout from "../layout/HRLayout";
import HRModal from "../components/HRModal";
import Pagination from "@/components/common/Pagination";
import {
  HR_PAGE,
  HR_H1,
  HR_SUBTITLE,
  HR_FILTER_CHIPS,
  HR_TABLE_WRAP,
  HR_NATIVE_FIELD,
} from "../hrLayoutClasses";
import { formatDateVN } from "../hrDateFormat";
import { hrStatusBadgeClass } from "../hrTheme";
import { recruitmentJobIdRaw } from "../hrApplicationCode";
import { useApiRequest } from "../../hooks/useApiRequest";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
const HRJobManagement = () => {
  const { user } = useAuth();
  const isHr = String(user?.role || "").toLowerCase() === "hr";
  const needsApprovalForStatusChange = (job, targetStatus) => {
    if (!isHr) return false;
    if (targetStatus !== "active") return false;
    return job.lastStatusActorRole === "admin";
  };
  const jobStatusKey = (job) => (job.status || "").toLowerCase();
  const statusTargetLabel = (s) => {
    if (s === "active") return "Đăng tuyển";
    if (s === "closed") return "Đóng tin";
    if (s === "inactive") return "Lưu trữ";
    return s;
  };
  const formatLocationTypeLabel = (t) => {
    const x = String(t || "").toLowerCase();
    if (x === "onsite") return "Tại văn phòng";
    if (x === "remote") return "Làm từ xa";
    if (x === "hybrid") return "Kết hợp";
    return t || "";
  };
  const { makeJsonRequest } = useApiRequest();
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchInputRef, setSearchInputRef] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [limit] = useState(10);
  const [summary, setSummary] = useState({
    totalJobs: 0,
    totalActive: 0,
    totalDraft: 0,
    totalInactive: 0,
    totalClosed: 0,
    myJobs: 0,
    totalApplicants: 0,
  });
  const [pendingJobIdSet, setPendingJobIdSet] = useState([]);
  const [statusRequestModal, setStatusRequestModal] = useState(null);
  const [statusRequestMessage, setStatusRequestMessage] = useState("");
  const [statusRequestSubmitting, setStatusRequestSubmitting] = useState(false);
  const pageBusy = loading || statusRequestSubmitting;
  const fetchJobs = async (
    page = 1,
    search = "",
    statusFilter = "",
    filterType = "",
  ) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && {
          search,
        }),
        ...(statusFilter && {
          status: statusFilter,
        }),
        ...(filterType && {
          filter: filterType,
        }),
      });
      const response = await makeJsonRequest(`/api/hr/jobs?${params}`);
      if (response.success) {
        const jobsData = response.data || [];
        setJobs(jobsData);
        setFilteredJobs(jobsData);
        setCurrentPage(response.pagination?.currentPage || 1);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalJobs(response.pagination?.totalJobs || 0);
        setSummary(response.summary || summary);
        if (isHr) {
          try {
            const pr = await makeJsonRequest(
              "/api/hr/job-status-requests/pending",
            );
            if (pr.success && Array.isArray(pr.data)) {
              setPendingJobIdSet(pr.data.map((x) => String(x.jobId)));
            }
          } catch (_) {
            setPendingJobIdSet([]);
          }
        }
      } else {
        setError(response.message || "Không thể tải danh sách tin tuyển dụng");
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setError("Không thể tải danh sách tin tuyển dụng");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== searchTerm) {
        setSearchTerm(searchInput);
        setIsSearching(true);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchInput, searchTerm]);
  useEffect(() => {
    if (!loading && isSearching) {
      const timer = setTimeout(() => {
        setIsSearching(false);
        if (searchInputRef && document.activeElement !== searchInputRef) {
          if (searchInput === searchTerm) {
            searchInputRef.focus();
            searchInputRef.select();
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, isSearching, searchInputRef]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "f" &&
        !showJobModal &&
        !statusRequestModal
      ) {
        e.preventDefault();
        if (searchInputRef) {
          searchInputRef.focus();
          searchInputRef.select();
        }
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef) {
        setSearchInput("");
        searchInputRef.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchInputRef, showJobModal, statusRequestModal]);
  useEffect(() => {
    const statusFilter =
      filter === "active" ? "active" : filter === "draft" ? "draft" : "";
    const filterType = filter === "my-jobs" ? "my-jobs" : "";
    fetchJobs(1, searchTerm, statusFilter, filterType);
    setCurrentPage(1);
    setInitialLoad(false);
  }, []);
  useEffect(() => {
    if (location.state?.refreshJobs) {
      const statusFilter =
        filter === "active" ? "active" : filter === "draft" ? "draft" : "";
      const filterType = filter === "my-jobs" ? "my-jobs" : "";
      fetchJobs(1, searchTerm, statusFilter, filterType);
      setCurrentPage(1);
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location.state?.refreshJobs]);
  useEffect(() => {
    if (!initialLoad) {
      const statusFilter =
        filter === "active" ? "active" : filter === "draft" ? "draft" : "";
      const filterType = filter === "my-jobs" ? "my-jobs" : "";
      fetchJobs(1, searchTerm, statusFilter, filterType);
      setCurrentPage(1);
    }
  }, [filter, searchTerm, initialLoad]);
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        if (showJobModal) {
          setShowJobModal(false);
        }
        if (statusRequestModal) {
          setStatusRequestModal(null);
          setStatusRequestMessage("");
        }
      }
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [showJobModal, statusRequestModal]);
  const handlePageChange = (page) => {
    const statusFilter =
      filter === "active" ? "active" : filter === "draft" ? "draft" : "";
    const filterType = filter === "my-jobs" ? "my-jobs" : "";
    fetchJobs(page, searchTerm, statusFilter, filterType);
  };
  const getStatusLabel = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "Đang đăng tuyển";
    if (s === "draft") return "Bản nháp";
    if (s === "closed") return "Đã đóng";
    if (s === "archived" || s === "inactive") return "Đã lưu trữ";
    return status || "";
  };
  const handleJobAction = async (action, jobId) => {
    try {
      switch (action) {
        case "view":
          const job = jobs.find((j) => j.id === jobId);
          setSelectedJob(job);
          setShowJobModal(true);
          break;
        case "edit":
          navigate(`/hr/jobs/${jobId}/edit`);
          break;
        case "applications":
          navigate(`/hr/applications?jobId=${jobId}`);
          break;
      }
    } catch (error) {
      console.error("Job action error:", error);
      setError(error.message || "Thao tác thất bại");
    }
  };
  const patchJobStatusDirect = async (jobId, status) => {
    const closeResponse = await makeJsonRequest(
      `/api/hr/jobs/${jobId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      },
    );
    return closeResponse;
  };
  const attemptHrStatusChange = (job, targetStatus) => {
    if (needsApprovalForStatusChange(job, targetStatus)) {
      setStatusRequestModal({
        job,
        targetStatus,
      });
      setStatusRequestMessage("");
      return;
    }
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await patchJobStatusDirect(job.id, targetStatus);
        if (res?.success) {
          const statusFilter =
            filter === "active" ? "active" : filter === "draft" ? "draft" : "";
          const filterType = filter === "my-jobs" ? "my-jobs" : "";
          await fetchJobs(currentPage, searchTerm, statusFilter, filterType);
        } else {
          setError(res?.message || "Không cập nhật được trạng thái");
        }
      } catch (e) {
        setError(e?.message || "Không cập nhật được trạng thái");
      } finally {
        setLoading(false);
      }
    })();
  };
  const submitStatusChangeRequest = async () => {
    if (!statusRequestModal?.job?.id) return;
    const text = statusRequestMessage.trim();
    if (text.length < 10) {
      setError("Vui lòng nhập nội dung đề xuất, tối thiểu 10 ký tự.");
      return;
    }
    try {
      setStatusRequestSubmitting(true);
      setError(null);
      const res = await makeJsonRequest(
        `/api/hr/jobs/${statusRequestModal.job.id}/status-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestedStatus: statusRequestModal.targetStatus,
            message: text,
          }),
        },
      );
      if (res?.success) {
        setStatusRequestModal(null);
        setStatusRequestMessage("");
        const statusFilter =
          filter === "active" ? "active" : filter === "draft" ? "draft" : "";
        const filterType = filter === "my-jobs" ? "my-jobs" : "";
        await fetchJobs(currentPage, searchTerm, statusFilter, filterType);
      } else {
        setError(res?.message || "Không gửi được yêu cầu");
      }
    } catch (e) {
      setError(e?.message || "Không gửi được yêu cầu");
    } finally {
      setStatusRequestSubmitting(false);
    }
  };
  return (
    <HRLayout>
      <div className={HR_PAGE}>
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1">
              <h1 className={HR_H1}>Tin tuyển dụng</h1>
              <p className={HR_SUBTITLE}>
                Đăng, chỉnh sửa và quản lý tin tuyển dụng findme
              </p>
            </div>
            <div className="w-full shrink-0 lg:w-auto">
              <Button
                className="min-h-11 w-full touch-manipulation font-['Roboto'] lg:w-auto"
                asChild
                disabled={pageBusy}
              >
                <Link
                  to="/hr/jobs/create"
                  tabIndex={pageBusy ? -1 : undefined}
                  aria-hidden={pageBusy}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="size-5 shrink-0" />
                  Đăng tin tuyển dụng
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="shadow-sm">
                  <CardContent className="space-y-2 pt-6">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-10" />
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="shadow-sm ring-1 ring-primary/15">
                  <CardContent className="pt-6">
                    <p className="mb-1 font-['Roboto'] text-sm text-muted-foreground">
                      Tổng tin đăng
                    </p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-primary">
                      {summary.totalJobs}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <p className="mb-1 font-['Roboto'] text-sm text-muted-foreground">
                      Đang đăng tuyển
                    </p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-primary">
                      {summary.totalActive}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <p className="mb-1 font-['Roboto'] text-sm text-muted-foreground">
                      Bản nháp
                    </p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                      {summary.totalDraft}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <p className="mb-1 font-['Roboto'] text-sm text-muted-foreground">
                      Đã đóng
                    </p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-primary">
                      {summary.totalClosed}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <p className="mb-1 font-['Roboto'] text-sm text-muted-foreground">
                      Tin do tôi đăng
                    </p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                      {summary.myJobs}
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <p className="mb-1 font-['Roboto'] text-sm text-muted-foreground">
                      Tổng ứng viên
                    </p>
                    <p className="font-['Open_Sans'] text-2xl font-bold text-primary">
                      {summary.totalApplicants}
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 space-y-3">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription className="font-['Roboto'] text-destructive/90">
                {error}
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setError(null);
                  const statusFilter =
                    filter === "active"
                      ? "active"
                      : filter === "draft"
                        ? "draft"
                        : "";
                  const filterType = filter === "my-jobs" ? "my-jobs" : "";
                  fetchJobs(currentPage, searchTerm, statusFilter, filterType);
                }}
              >
                Thử lại
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setError(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        )}

        <Card className="mb-4 shadow-sm sm:mb-6">
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="relative max-w-md flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={setSearchInputRef}
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value && !e.target.selectionStart) {
                    e.target.select();
                  }
                }}
                className={cn(
                  HR_NATIVE_FIELD,
                  "min-h-11 pl-9 pr-2 font-['Roboto']",
                )}
                placeholder="Tìm theo chức danh hoặc phòng ban"
                autoComplete="off"
              />
            </div>

            <div className={HR_FILTER_CHIPS}>
              <Button
                type="button"
                variant={filter === "all" ? "default" : "secondary"}
                size="sm"
                disabled={loading}
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("all")}
              >
                Tất cả
              </Button>
              <Button
                type="button"
                variant={filter === "my-jobs" ? "default" : "secondary"}
                size="sm"
                disabled={loading}
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("my-jobs")}
              >
                Của tôi
              </Button>
              <Button
                type="button"
                variant={filter === "active" ? "default" : "secondary"}
                size="sm"
                disabled={loading}
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("active")}
              >
                Đang đăng
              </Button>
              <Button
                type="button"
                variant={filter === "draft" ? "default" : "secondary"}
                size="sm"
                disabled={loading}
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("draft")}
              >
                Bản nháp
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card className="shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "STT",
                    "Mã TD",
                    "Chức danh",
                    "Phòng ban",
                    "Trạng thái",
                    "Ứng viên",
                    "Ngày đăng",
                    "Hạn",
                    "",
                  ].map((h) => (
                    <TableHead key={h} className="font-['Roboto'] text-xs">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {!loading && (
          <div className={HR_TABLE_WRAP}>
            <Card className="overflow-hidden shadow-sm">
              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 text-center font-['Roboto'] text-xs">
                        STT
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-xs">
                        Mã tuyển dụng
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-xs">
                        Chức danh
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-xs">
                        Phòng ban
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-xs">
                        Trạng thái
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-xs">
                        Ứng viên
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-xs">
                        Ngày đăng
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-xs">
                        Hạn chót
                      </TableHead>
                      <TableHead className="text-right font-['Roboto'] text-xs">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job, rowIndex) => {
                      const stt = (currentPage - 1) * limit + rowIndex + 1;
                      const jobCode = recruitmentJobIdRaw(job);
                      return (
                        <TableRow key={job.id}>
                          <TableCell className="text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                            {stt}
                          </TableCell>
                          <TableCell
                            className="align-top font-mono text-xs font-medium text-foreground"
                            title={jobCode || undefined}
                          >
                            {jobCode || "—"}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/hr/applications?jobId=${job.id}`}
                              className="font-['Open_Sans'] text-sm font-medium text-primary hover:underline"
                            >
                              {job.title}
                            </Link>
                            <div className="font-['Roboto'] text-xs text-muted-foreground">
                              {job.salary}
                            </div>
                            <div className="font-['Roboto'] text-xs text-muted-foreground/80">
                              Đăng bởi {job.postedByName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-['Roboto'] text-sm text-foreground">
                              {job.department}
                            </div>
                            <div className="font-['Roboto'] text-xs text-muted-foreground">
                              {job.jobType}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-normal",
                                  hrStatusBadgeClass(job.status),
                                )}
                              >
                                {getStatusLabel(job.status)}
                              </Badge>
                              {isHr &&
                                pendingJobIdSet.includes(String(job.id)) && (
                                  <span className="rounded bg-destructive/10 px-2 py-0.5 font-['Roboto'] text-xs font-medium text-destructive">
                                    Chờ phê duyệt
                                  </span>
                                )}
                              {isHr &&
                                job.lastStatusActorRole === "admin" &&
                                jobStatusKey(job) !== "active" &&
                                !pendingJobIdSet.includes(String(job.id)) && (
                                  <span className="max-w-[11rem] font-['Roboto'] text-xs text-muted-foreground">
                                    Cần phê duyệt từ quản trị
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-['Roboto'] text-sm text-foreground">
                              {job.applicants}
                            </div>
                            {job.recentApplications > 0 && (
                              <div className="font-['Roboto'] text-xs text-primary">
                                +{job.recentApplications} tuần này
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-['Roboto'] text-sm text-muted-foreground">
                            {formatDateVN(job.postedDate)}
                          </TableCell>
                          <TableCell className="font-['Roboto'] text-sm text-muted-foreground">
                            {job.deadline
                              ? formatDateVN(job.deadline) || "—"
                              : "Không có hạn"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => handleJobAction("view", job.id)}
                                title="Xem chi tiết"
                              >
                                <Eye className="size-4" aria-hidden />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    disabled={
                                      loading ||
                                      (isHr &&
                                        pendingJobIdSet.includes(
                                          String(job.id),
                                        ))
                                    }
                                    title={
                                      isHr &&
                                      pendingJobIdSet.includes(String(job.id))
                                        ? "Đang chờ phê duyệt"
                                        : "Thay đổi trạng thái tin đăng"
                                    }
                                  >
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-52 font-['Roboto']"
                                >
                                  <DropdownMenuItem
                                    disabled={jobStatusKey(job) === "active"}
                                    onClick={() =>
                                      attemptHrStatusChange(job, "active")
                                    }
                                    className="gap-2"
                                  >
                                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                                    Đăng tuyển
                                    {jobStatusKey(job) === "active" && (
                                      <Check className="ml-auto size-3 text-primary" />
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={jobStatusKey(job) === "closed"}
                                    onClick={() =>
                                      attemptHrStatusChange(job, "closed")
                                    }
                                    className="gap-2"
                                  >
                                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                                    Đóng
                                    {jobStatusKey(job) === "closed" && (
                                      <Check className="ml-auto size-3 text-primary" />
                                    )}
                                  </DropdownMenuItem>

                                </DropdownMenuContent>
                              </DropdownMenu>
                              {job.createdBy === "me" && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() =>
                                    handleJobAction("edit", job.id)
                                  }
                                  title="Chỉnh sửa tin đăng"
                                >
                                  <Pencil className="size-4" aria-hidden />
                                </Button>
                              )}
                              {job.applicants > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() =>
                                    handleJobAction("applications", job.id)
                                  }
                                  title="Xem hồ sơ ứng viên"
                                >
                                  <ClipboardList
                                    className="size-4"
                                    aria-hidden
                                  />
                                </Button>
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
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading}
                totalItems={totalJobs}
                limit={limit}
                itemLabel="kết quả"
              />
            </Card>
          </div>
        )}

        {!loading && filteredJobs.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <Briefcase
                className="mx-auto size-12 text-muted-foreground"
                aria-hidden
              />
              <h3 className="mt-2 font-['Open_Sans'] text-sm font-medium text-foreground">
                Không tìm thấy tin phù hợp
              </h3>
              <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">
                {searchInput || filter !== "all"
                  ? "Hãy thử điều chỉnh từ khoá hoặc bộ lọc để tìm kết quả phù hợp."
                  : "Bắt đầu bằng cách tạo tin tuyển dụng mới."}
              </p>
              <Button
                className="mt-6 font-['Roboto']"
                asChild
                disabled={pageBusy}
              >
                <Link
                  to="/hr/jobs/create"
                  tabIndex={pageBusy ? -1 : undefined}
                  aria-hidden={pageBusy}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Tạo tin tuyển dụng
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <HRModal
          open={Boolean(showJobModal && selectedJob)}
          onClose={() => setShowJobModal(false)}
          size="xl"
          header={
            <h3 className="font-['Open_Sans'] text-xl font-semibold text-foreground sm:text-2xl">
              {selectedJob?.title}
            </h3>
          }
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                className="font-['Roboto']"
                onClick={() => setShowJobModal(false)}
              >
                Đóng
              </Button>
              {selectedJob && selectedJob.applicants > 0 && (
                <Button className="font-['Roboto']" asChild>
                  <Link to={`/hr/applications?jobId=${selectedJob.id}`}>
                    Xem {selectedJob.applicants} hồ sơ ứng viên
                  </Link>
                </Button>
              )}
              {selectedJob && selectedJob.createdBy === "me" && (
                <Button variant="secondary" className="font-['Roboto']" asChild>
                  <Link to={`/hr/jobs/${selectedJob.id}/edit`}>
                    Chỉnh sửa tin đăng
                  </Link>
                </Button>
              )}
            </div>
          }
        >
          {selectedJob && (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:mb-6">
                {[
                  {
                    title: "Mã tuyển dụng",
                    value: (
                      <span className="font-mono text-xs break-all">
                        {recruitmentJobIdRaw(selectedJob) || "—"}
                      </span>
                    ),
                  },
                  {
                    title: "Phòng ban",
                    value: selectedJob.department,
                  },
                  {
                    title: "Loại hình",
                    value: selectedJob.jobType,
                  },
                  {
                    title: "Địa điểm",
                    value: selectedJob.location,
                  },
                  {
                    title: "Hình thức làm việc",
                    value: formatLocationTypeLabel(selectedJob.locationType),
                  },
                  {
                    title: "Mức lương",
                    value: selectedJob.salary,
                  },
                  {
                    title: "Trạng thái",
                    value: (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-normal",
                          hrStatusBadgeClass(selectedJob.status),
                        )}
                      >
                        {getStatusLabel(selectedJob.status)}
                      </Badge>
                    ),
                  },
                  {
                    title: "Ứng viên",
                    value: `${selectedJob.applicants} tổng`,
                  },
                  {
                    title: "Đăng bởi",
                    value: selectedJob.postedByName,
                  },
                  {
                    title: "Lượt xem",
                    value: selectedJob.views || 0,
                  },
                  {
                    title: "Cấp kinh nghiệm",
                    value: selectedJob.experienceLevel,
                  },
                  {
                    title: "Hạn nộp",
                    value: formatDateVN(selectedJob.applicationDeadline),
                  },
                ].map((detail) => (
                  <div key={detail.title}>
                    <h4 className="mb-1 font-['Roboto'] text-sm font-medium text-muted-foreground">
                      {detail.title}
                    </h4>
                    <div className="font-['Roboto'] text-foreground">
                      {detail.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="mb-2 font-['Open_Sans'] text-lg font-semibold text-foreground">
                  Mô tả
                </h4>
                <p className="whitespace-pre-wrap font-['Roboto'] text-muted-foreground">
                  {selectedJob.description}
                </p>
              </div>
            </>
          )}
        </HRModal>

        <HRModal
          open={Boolean(statusRequestModal)}
          onClose={() => {
            if (!statusRequestSubmitting) {
              setStatusRequestModal(null);
              setStatusRequestMessage("");
            }
          }}
          closeOnBackdrop={!statusRequestSubmitting}
          size="md"
          title="Gửi yêu cầu tới quản trị hệ thống"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="font-['Roboto']"
                disabled={statusRequestSubmitting}
                onClick={() => {
                  setStatusRequestModal(null);
                  setStatusRequestMessage("");
                }}
              >
                Hủy
              </Button>
              <Button
                className="font-['Roboto']"
                disabled={
                  statusRequestSubmitting ||
                  statusRequestMessage.trim().length < 10
                }
                onClick={() => submitStatusChangeRequest()}
              >
                {statusRequestSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </div>
          }
        >
          {statusRequestModal && (
            <>
              <p className="mb-1 font-['Roboto'] text-sm text-muted-foreground">
                Tin:{" "}
                <span className="font-medium text-foreground">
                  {statusRequestModal.job.title}
                </span>
              </p>
              <p className="mb-4 font-['Roboto'] text-sm text-muted-foreground">
                Đề xuất trạng thái:{" "}
                <span className="font-medium text-primary">
                  {statusTargetLabel(statusRequestModal.targetStatus)}
                </span>
              </p>
              <p className="mb-2 font-['Roboto'] text-xs text-muted-foreground">
                Trạng thái tin do quản trị hệ thống cập nhật gần nhất. Mọi thay
                đổi trạng thái đăng tuyển hoặc lưu trữ cần được phê duyệt trước
                khi áp dụng.
              </p>
              <Label
                htmlFor="status-request-msg"
                className="mb-2 font-['Roboto']"
              >
                Nội dung đề xuất
              </Label>
              <Textarea
                id="status-request-msg"
                value={statusRequestMessage}
                onChange={(e) => setStatusRequestMessage(e.target.value)}
                rows={5}
                className="font-['Roboto']"
                placeholder="Nêu rõ lý do và nội dung đề xuất thay đổi trạng thái tin đăng"
              />
            </>
          )}
        </HRModal>
      </div>
    </HRLayout>
  );
};
export default HRJobManagement;
