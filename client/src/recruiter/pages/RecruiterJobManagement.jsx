import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import RecruiterLayout from "../layout/RecruiterLayout";
import RecruiterModal from "../components/RecruiterModal";
import Pagination from "@/components/common/Pagination";
import {
  HR_PAGE,
  HR_H1,
  HR_SUBTITLE,
  HR_FILTER_CHIPS,
  HR_TABLE_WRAP,
  HR_NATIVE_FIELD,
} from "../recruiterLayoutClasses";
import { formatDateVN } from "@/utils/dateFormat";
import { recruiterStatusBadgeClass } from "../recruiterTheme";
import { recruitmentJobIdRaw } from "../recruiterApplicationCode";
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
  CalendarDays,
  Check,
  ClipboardList,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
const RecruiterJobManagement = () => {
  const { user } = useAuth();
  const isHr = String(user?.role || "").toLowerCase() === "recruiter";
  const needsApprovalForStatusChange = (job, targetStatus) => {
    if (!isHr) return false;
    if (targetStatus === "active") return true;
    return false;
  };
  const jobStatusKey = (job) => (job.status || "").toLowerCase();
  const statusTargetLabel = (s) => {
    if (s === "active") return "Đăng tuyển";
    if (s === "closed") return "Đóng tin";

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
      const response = await makeJsonRequest(`/api/recruiter/jobs?${params}`);
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
              "/api/recruiter/job-status-requests/pending",
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
    const statusFilter = filter === "all" ? "" : filter;
    const filterType = "";
    fetchJobs(1, searchTerm, statusFilter, filterType);
    setCurrentPage(1);
    setInitialLoad(false);
  }, []);
  useEffect(() => {
    if (location.state?.refreshJobs) {
      const statusFilter = filter === "all" ? "" : filter;
      const filterType = "";
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
      const statusFilter = filter === "all" ? "" : filter;
      const filterType = "";
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
    const statusFilter = filter === "all" ? "" : filter;
    const filterType = "";
    fetchJobs(page, searchTerm, statusFilter, filterType);
  };
  const getStatusLabel = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "Đang hoạt động";
    if (s === "closed") return "Đã đóng";
    if (s === "pending_approval") return "Chờ phê duyệt";
    if (s === "draft") return "Bản nháp";
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
          navigate(`/recruiter/jobs/${jobId}/edit`);
          break;
        case "applications":
          navigate(`/recruiter/applications?jobId=${jobId}`);
          break;
      }
    } catch (error) {
      console.error("Job action error:", error);
      setError(error.message || "Thao tác thất bại");
    }
  };
  const patchJobStatusDirect = async (jobId, status) => {
    const closeResponse = await makeJsonRequest(
      `/api/recruiter/jobs/${jobId}/status`,
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
          const statusFilter = filter === "all" ? "" : filter;
          const filterType = "";
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
        `/api/recruiter/jobs/${statusRequestModal.job.id}/status-request`,
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
        const statusFilter = filter === "all" ? "" : filter;
        const filterType = "";
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
    <RecruiterLayout>
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
                  to="/recruiter/jobs/create"
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

          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  const statusFilter = filter === "all" ? "" : filter;
                  const filterType = "";
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
                variant={filter === "active" ? "default" : "secondary"}
                size="sm"
                disabled={loading}
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("active")}
              >
                Đang hoạt động
              </Button>
              <Button
                type="button"
                variant={filter === "closed" ? "default" : "secondary"}
                size="sm"
                disabled={loading}
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("closed")}
              >
                Đã đóng
              </Button>
              <Button
                type="button"
                variant={filter === "draft" ? "default" : "secondary"}
                size="sm"
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("draft")}
              >
                Bản nháp
              </Button>
              <Button
                type="button"
                variant={filter === "pending_approval" ? "default" : "secondary"}
                size="sm"
                className="shrink-0 touch-manipulation font-['Roboto']"
                onClick={() => setFilter("pending_approval")}
              >
                Chờ phê duyệt
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
                    "Tin tuyển dụng",
                    "Trạng thái",
                    "Số ứng viên",
                    "Ngày đăng tin",
                    "Ngày hết hạn",
                    "Thao tác",
                  ].map((h) => (
                    <TableHead key={h} className="font-['Roboto'] text-sm">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
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
                      <TableHead className="w-14 text-center font-['Roboto'] text-sm">
                        STT
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-sm">
                        Tin tuyển dụng
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-sm">
                        Trạng thái
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-sm">
                        Số ứng viên
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-sm">
                        Ngày đăng tin
                      </TableHead>
                      <TableHead className="font-['Roboto'] text-sm">
                        Ngày hết hạn
                      </TableHead>
                      <TableHead className="text-right font-['Roboto'] text-sm">
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
                          <TableCell className="text-center font-['Roboto'] text-base tabular-nums text-muted-foreground">
                            {stt}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/recruiter/applications?jobId=${job.id}`}
                              className="font-['Open_Sans'] text-base font-medium text-primary hover:underline"
                            >
                              {job.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-normal text-sm px-2 py-0.5",
                                  recruiterStatusBadgeClass(job.status),
                                )}
                              >
                                {getStatusLabel(job.status)}
                              </Badge>
                              {isHr &&
                                pendingJobIdSet.includes(String(job.id)) &&
                                jobStatusKey(job) !== "draft" && jobStatusKey(job) !== "pending_approval" && (
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
                            <div className="font-['Roboto'] text-base text-foreground">
                              {job.applicants}
                            </div>
                            {job.recentApplications > 0 && (
                              <div className="font-['Roboto'] text-sm text-primary">
                                +{job.recentApplications} tuần này
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-['Roboto'] text-base text-muted-foreground">
                            {formatDateVN(job.postedDate)}
                          </TableCell>
                          <TableCell className="font-['Roboto'] text-base text-muted-foreground">
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
                  to="/recruiter/jobs/create"
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

        <RecruiterModal
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
                  <Link to={`/recruiter/applications?jobId=${selectedJob.id}`}>
                    Xem {selectedJob.applicants} hồ sơ ứng viên
                  </Link>
                </Button>
              )}
              {selectedJob && selectedJob.createdBy === "me" && (
                <Button variant="secondary" className="font-['Roboto']" asChild>
                  <Link to={`/recruiter/jobs/${selectedJob.id}/edit`}>
                    Chỉnh sửa tin đăng
                  </Link>
                </Button>
              )}
            </div>
          }
        >
          {selectedJob &&
            (() => {
              let desc = selectedJob.description || "";
              const idx = desc.indexOf("Cách thức ứng tuyển");
              if (idx !== -1) {
                let cutIdx = desc.lastIndexOf("<p", idx);
                if (cutIdx === -1) cutIdx = desc.lastIndexOf("<h", idx);
                if (cutIdx === -1) cutIdx = desc.lastIndexOf("<div", idx);
                if (cutIdx === -1 || idx - cutIdx > 100) cutIdx = idx;
                desc = desc.substring(0, cutIdx);
              }

              return (
                <div className="font-['Roboto'] text-foreground max-h-[65vh] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                  {/* Badge trạng thái + hạn nộp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit text-xs px-3 py-0.5 font-normal ",
                          recruiterStatusBadgeClass(selectedJob.status),
                        )}
                      >
                        {getStatusLabel(selectedJob.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Chi tiết tin — chips kiểu TopCV */}
                  <div className="mb-5">
                    <h4 className="font-['Open_Sans'] text-base font-semibold border-l-[3px] border-primary pl-3 mb-3">
                      Chi tiết tin tuyển dụng
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto] lg:justify-start gap-y-4 gap-x-8 lg:gap-x-16 text-sm mt-4">
                      {[
                        {
                          label: "Kinh nghiệm",
                          value: selectedJob.experienceLevel,
                        },
                        { label: "Loại hình", value: selectedJob.jobType },
                        {
                          label: "Hình thức",
                          value: formatLocationTypeLabel(
                            selectedJob.locationType,
                          ),
                        },
                        { label: "Mức lương", value: selectedJob.salary },
                        { label: "Địa điểm", value: selectedJob.location },
                      ]
                        .filter((x) => x.value)
                        .map(({ label, value }) => (
                          <div key={label} className="flex items-start gap-2">
                            <span className="font-medium text-muted-foreground whitespace-nowrap">
                              {label}:
                            </span>
                            <span className="font-medium text-foreground whitespace-nowrap">
                              {value}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Grid metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-secondary/30 rounded-xl px-5 py-4 mb-6 text-sm">
                    {[
                      {
                        icon: <Users className="size-4" />,
                        label: "Ứng viên",
                        value: `${selectedJob.applicants} người`,
                      },
                      {
                        icon: <Eye className="size-4" />,
                        label: "Lượt xem",
                        value: selectedJob.views || 0,
                      },

                      {
                        icon: <CalendarDays className="size-4" />,
                        label: "Ngày đăng",
                        value: formatDateVN(selectedJob.postedDate),
                      },
                      {
                        icon: <CalendarDays className="size-4" />,
                        label: "Ngày hết hạn",
                        value: selectedJob.deadline
                          ? formatDateVN(selectedJob.deadline)
                          : "—",
                      },
                    ].map(({ icon, label, value }) => (
                      <div key={label}>
                        <p className="text-[12px] text-muted-foreground flex items-center gap-1.5 mb-1">
                          {icon} {label}
                        </p>
                        <p className="font-medium text-foreground text-[14px]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Mô tả công việc */}
                  {desc && (
                    <div className="mb-5">
                      <h4 className="font-['Open_Sans'] text-base font-semibold border-l-[3px] border-primary pl-3 mb-3">
                        Mô tả công việc
                      </h4>
                      <div
                        className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h4]:font-bold [&_p]:my-2 [&_li]:mb-1 [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-bold [&_b]:font-bold"
                        dangerouslySetInnerHTML={{ __html: desc }}
                      />
                    </div>
                  )}

                  {/* Yêu cầu ứng viên */}
                  {selectedJob.requirements && (
                    <div className="mb-5">
                      <h4 className="font-['Open_Sans'] text-base font-semibold border-l-[3px] border-primary pl-3 mb-3">
                        Yêu cầu ứng viên
                      </h4>
                      <div
                        className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h4]:font-bold [&_p]:my-2 [&_li]:mb-1 [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-bold [&_b]:font-bold"
                        dangerouslySetInnerHTML={{
                          __html: selectedJob.requirements,
                        }}
                      />
                    </div>
                  )}

                  {/* Quyền lợi ứng viên */}
                  {selectedJob.benefits && (
                    <div className="mb-5">
                      <h4 className="font-['Open_Sans'] text-base font-semibold border-l-[3px] border-primary pl-3 mb-3">
                        Quyền lợi ứng viên
                      </h4>
                      <div
                        className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h4]:font-bold [&_p]:my-2 [&_li]:mb-1 [&_ol]:list-outside [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-outside [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-bold [&_b]:font-bold"
                        dangerouslySetInnerHTML={{
                          __html: selectedJob.benefits,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
        </RecruiterModal>

        <RecruiterModal
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
        </RecruiterModal>
      </div>
    </RecruiterLayout>
  );
};
export default RecruiterJobManagement;
