import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "../layout/AdminLayout";
import AdminModal from "../components/AdminModal";
import {
  ADMIN_PAGE,
  ADMIN_PAGE_HEADER,
  ADMIN_H1,
  ADMIN_SUBTITLE,
  ADMIN_NATIVE_FIELD,
  HR_TABLE_WRAP,
} from "../adminLayoutClasses";
import { formatDateVN } from "../adminDateFormat";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { useApiRequest } from "../../hooks/useApiRequest";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const AllJobsPage = () => {
  const { makeJsonRequest } = useApiRequest();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPostedById, setFilterPostedById] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterJobType, setFilterJobType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [departments, setDepartments] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hrPosterOptions, setHrPosterOptions] = useState([]);
  const [totals, setTotals] = useState(null);
  const buildQuery = useCallback(() => {
    const params = [];
    if (filterStatus !== "all")
      params.push(`status=${encodeURIComponent(filterStatus)}`);
    if (filterDepartment !== "all")
      params.push(`department=${encodeURIComponent(filterDepartment)}`);
    if (filterJobType !== "all")
      params.push(`jobType=${encodeURIComponent(filterJobType)}`);
    if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
    if (fromDate) params.push(`fromDate=${encodeURIComponent(fromDate)}`);
    if (toDate) params.push(`toDate=${encodeURIComponent(toDate)}`);
    if (sortBy) params.push(`sortBy=${encodeURIComponent(sortBy)}`);
    if (sortOrder) params.push(`sortOrder=${encodeURIComponent(sortOrder)}`);
    if (filterPostedById !== "all")
      params.push(`postedBy=${encodeURIComponent(filterPostedById)}`);
    params.push(`page=${page}`);
    params.push(`limit=${limit}`);
    return params.length ? `?${params.join("&")}` : "";
  }, [
    filterStatus,
    filterDepartment,
    filterJobType,
    filterPostedById,
    searchTerm,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
    page,
    limit,
  ]);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = buildQuery();
      const data = await makeJsonRequest(`/api/admin/jobs${query}`);
      if (data?.jobs) {
        setJobs(data.jobs);
        setHrPosterOptions(data.hrPosterOptions || []);
        setDepartments(data.departments || []);
        let incomingJobTypes = data.jobTypes || [];
        const lower = incomingJobTypes.map((j) => (j || "").toLowerCase());
        ["remote", "hybrid"].forEach((opt) => {
          if (!lower.includes(opt)) incomingJobTypes.push(opt);
        });
        setJobTypes(incomingJobTypes);
        if (data.pagination) setPagination(data.pagination);
        if (data.totals) setTotals(data.totals);
        setSelectedJobs(new Set());
      }
    } catch (e) {
      setError(e?.message || "Không tải được việc làm");
    } finally {
      setLoading(false);
    }
  }, [makeJsonRequest, buildQuery]);

  useEffect(() => {
    setPage(1);
  }, [
    filterStatus,
    filterDepartment,
    filterJobType,
    filterPostedById,
    searchTerm,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
    limit,
  ]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);
  const selectedHrLabel =
    filterPostedById === "all"
      ? ""
      : hrPosterOptions.find((h) => h.id === filterPostedById)?.label ||
        filterPostedById;
  const updateJobStatusDirect = async (jobId, status) => {
    try {
      const response = await makeJsonRequest(
        `/api/admin/jobs/${jobId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        },
      );
      if (response?.job) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? response.job : j)));
      }
    } catch (e) {
      setError(e.message || "Không cập nhật được trạng thái");
    }
  };
  const handleBulkAction = async (status) => {
    if (selectedJobs.size === 0) return;
    try {
      await makeJsonRequest("/api/admin/jobs/bulk/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobIds: Array.from(selectedJobs),
          status,
        }),
      });
      setJobs(
        jobs.map((j) =>
          selectedJobs.has(j.id)
            ? {
                ...j,
                status,
              }
            : j,
        ),
      );
      setSelectedJobs(new Set());
    } catch (e) {
      setError(e.message || "Cập nhật hàng loạt thất bại");
    }
  };
  const toggleSelectJob = (jobId) => {
    setSelectedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedJobs.size === jobs.length) setSelectedJobs(new Set());
    else setSelectedJobs(new Set(jobs.map((j) => j.id)));
  };
  const openJobDetail = async (job) => {
    setSelectedJob(job);
    try {
      const detail = await makeJsonRequest(`/api/admin/jobs/${job.id}`);
      if (detail?.job)
        setSelectedJob((prev) => ({
          ...prev,
          ...detail.job,
        }));
    } catch {
      /* keep list row; detail extras optional */
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
      case "closed":
        return "border-destructive/30 bg-destructive/10 text-destructive";
      case "draft":
        return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";
      case "inactive":
        return "border-destructive/30 bg-destructive/10 text-destructive";
      default:
        return "border-border bg-muted text-foreground";
    }
  };
  const getStatusLabel = (status) => {
    const map = {
      active: "đang hoạt động",
      closed: "đã đóng",
      draft: "bản nháp",
      inactive: "không hoạt động",
    };
    return map[status] || status;
  };
  const getApplicationStatusLabel = (status) => {
    const s = (status || "").toString().toLowerCase();
    const map = {
      submitted: "Đã nộp",
      under_review: "Đang xem xét",
      shortlisted: "Đang xem xét",
      interview_scheduled: "Đã mời phỏng vấn",
      interview_confirmed: "Đã xác nhận lịch phỏng vấn",
      interview_passed: "Đạt phỏng vấn",
      offer_extended: "Đã gửi đề nghị",
      offer_accepted: "Đã chấp nhận đề nghị",
      offer_declined: "Từ chối đề nghị",
      rejected: "Đã từ chối",
      withdrawn: "Ứng viên rút đơn",
    };
    return map[s] || (s ? s.replaceAll("_", " ") : s);
  };
  const totalJobs = totals?.totalJobs ?? pagination.totalItems ?? jobs.length;
  const activeJobs = totals?.activeJobs ?? 0;
  const totalApplications = totals?.totalApplications ?? 0;
  const totalInterviewPassed = totals?.totalInterviewPassed ?? 0;
  return (
    <AdminLayout>
      <div className={ADMIN_PAGE}>
        <div className={ADMIN_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={ADMIN_H1}>Tổng quan tất cả việc làm</h1>
            <p className={ADMIN_SUBTITLE}>
              Theo dõi tất cả tin tuyển dụng trong tổ chức của bạn.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription className="font-['Roboto']">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 justify-center items-center">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-muted p-3">
                <svg
                  className="size-6 stroke-current text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6"
                  />
                </svg>
              </div>
              <div>
                <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Tổng việc làm
                </p>
                <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                  {totalJobs}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-muted p-3">
                <svg
                  className="size-6 stroke-current text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Việc làm đang hoạt động
                </p>
                <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                  {activeJobs}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-muted p-3">
                <svg
                  className="size-6 stroke-current text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Tổng đơn ứng tuyển
                </p>
                <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                  {totalApplications}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-muted p-3">
                <svg
                  className="size-6 stroke-current text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Ứng viên pass phỏng vấn
                </p>
                <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                  {totalInterviewPassed}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-3 shadow-sm">
          <CardContent className="py-2 px-3 space-y-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-center">
              <div className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tiêu đề, phòng ban hoặc địa điểm"
                  className="min-h-11 pl-10 font-['Roboto']"
                />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["all", "active", "closed", "draft", "inactive"].map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={filterStatus === s ? "default" : "outline"}
                    size="sm"
                    className="rounded-full font-['Roboto']"
                    onClick={() => {
                      setFilterStatus(s);
                      setPage(1);
                    }}
                  >
                    {s === "all"
                      ? "Tất cả"
                      : s === "active"
                        ? "Đang hoạt động"
                        : s === "closed"
                          ? "Đã đóng"
                          : s === "draft"
                            ? "Bản nháp"
                            : s === "inactive"
                              ? "Không hoạt động"
                              : s}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-['Roboto']"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  <ChevronRight
                    className={cn(
                      "size-4 transition-transform",
                      showAdvanced && "rotate-90",
                    )}
                  />
                  {showAdvanced ? "Ẩn bộ lọc" : "Thêm bộ lọc"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-['Roboto'] text-destructive hover:text-destructive"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterPostedById("all");
                    setFilterDepartment("all");
                    setFilterJobType("all");
                    setFromDate("");
                    setToDate("");
                    setSortBy("createdAt");
                    setSortOrder("desc");
                    setPage(1);
                  }}
                >
                  Xóa
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {filterDepartment !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 font-['Roboto'] font-normal"
                >
                  Phòng ban: {filterDepartment}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-5 shrink-0"
                    onClick={() => setFilterDepartment("all")}
                    aria-label="Bỏ lọc phòng ban"
                  >
                    ×
                  </Button>
                </Badge>
              )}
              {filterJobType !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 font-['Roboto'] font-normal"
                >
                  Loại: {filterJobType}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-5 shrink-0"
                    onClick={() => setFilterJobType("all")}
                    aria-label="Bỏ lọc loại việc"
                  >
                    ×
                  </Button>
                </Badge>
              )}
              {filterPostedById !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 font-['Roboto'] font-normal"
                >
                  HR: {selectedHrLabel}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-5 shrink-0"
                    onClick={() => setFilterPostedById("all")}
                    aria-label="Bỏ lọc HR"
                  >
                    ×
                  </Button>
                </Badge>
              )}
              {(fromDate || toDate) && (
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 font-['Roboto'] font-normal"
                >
                  Ngày: {fromDate || "…"} → {toDate || "…"}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-5 shrink-0"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    aria-label="Bỏ lọc ngày"
                  >
                    ×
                  </Button>
                </Badge>
              )}
            </div>

            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-xs">Phòng ban</Label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className={ADMIN_NATIVE_FIELD}
                  >
                    <option value="all">Tất cả phòng ban</option>
                    {departments.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-xs">
                    Loại việc làm
                  </Label>
                  <select
                    value={filterJobType}
                    onChange={(e) => setFilterJobType(e.target.value)}
                    className={ADMIN_NATIVE_FIELD}
                  >
                    <option value="all">Tất cả loại</option>
                    {jobTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-xs">Đăng bởi</Label>
                  <select
                    value={filterPostedById}
                    onChange={(e) => setFilterPostedById(e.target.value)}
                    className={ADMIN_NATIVE_FIELD}
                  >
                    <option value="all">Tất cả HR</option>
                    {hrPosterOptions.map((hr) => (
                      <option key={hr.id} value={hr.id}>
                        {hr.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-xs">Từ</Label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={ADMIN_NATIVE_FIELD}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-xs">Đến</Label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={ADMIN_NATIVE_FIELD}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-['Roboto'] text-xs">Sắp xếp</Label>
                  <select
                    value={`${sortBy}:${sortOrder}`}
                    onChange={(e) => {
                      const [sb, so] = e.target.value.split(":");
                      setSortBy(sb);
                      setSortOrder(so);
                    }}
                    className={ADMIN_NATIVE_FIELD}
                  >
                    <option value="createdAt:desc">Mới nhất</option>
                    <option value="createdAt:asc">Cũ nhất</option>
                    <option value="title:asc">Tiêu đề A-Z</option>
                    <option value="title:desc">Tiêu đề Z-A</option>
                    <option value="applications:desc">
                      Đơn ứng tuyển cao-thấp
                    </option>
                    <option value="applications:asc">
                      Đơn ứng tuyển thấp-cao
                    </option>
                    <option value="status:asc">Trạng thái A-Z</option>
                    <option value="status:desc">Trạng thái Z-A</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-sm">
          {selectedJobs.size > 0 && (
            <div className="flex items-center justify-between border-b bg-muted/50 px-6 py-3 text-sm">
              <div className="font-['Roboto'] text-foreground">
                {selectedJobs.size} đã chọn
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="font-['Roboto']"
                  onClick={() => handleBulkAction("active")}
                >
                  Kích hoạt
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="font-['Roboto']"
                  onClick={() => handleBulkAction("closed")}
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-['Roboto']"
                  onClick={() => setSelectedJobs(new Set())}
                >
                  Bỏ chọn
                </Button>
              </div>
            </div>
          )}
          <div className="border-b px-6 py-4">
            <h3 className="font-['Open_Sans'] text-lg font-semibold text-foreground">
              Việc làm ({pagination.totalItems ?? jobs.length})
            </h3>
          </div>

          <div className={HR_TABLE_WRAP}>
            {loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 px-2 text-center font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      STT
                    </TableHead>
                    <TableHead className="w-10 px-3">
                      <Checkbox
                        checked={
                          jobs.length > 0 && selectedJobs.size === jobs.length
                        }
                        onCheckedChange={() => toggleSelectAll()}
                      />
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Chi tiết việc làm
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Đăng bởi
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Đơn ứng tuyển
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Trạng thái
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ngày đăng
                    </TableHead>
                    <TableHead className="px-6 text-right font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job, index) => (
                    <TableRow key={job.id}>
                      <TableCell className="px-2 py-4 text-center font-['Roboto'] text-sm tabular-nums text-muted-foreground">
                        {(page - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell className="px-3 py-4">
                        <Checkbox
                          checked={selectedJobs.has(job.id)}
                          onCheckedChange={() => toggleSelectJob(job.id)}
                        />
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-normal">
                        <div>
                          <div className="font-['Open_Sans'] text-sm font-medium text-foreground">
                            {job.title}
                          </div>
                          <div className="font-['Roboto'] text-sm text-muted-foreground">
                            {job.department} • {job.location} • {job.type}
                          </div>
                          <div className="mt-1 font-['Roboto'] text-sm text-muted-foreground">
                            {job.salary}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-['Open_Sans'] text-sm font-medium text-foreground">
                          {job.postedBy}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-['Roboto'] text-sm text-foreground">
                          <span>{job.applications} đã nộp</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-['Roboto'] font-normal",
                            getStatusColor(job.status),
                          )}
                        >
                          {getStatusLabel(job.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-['Roboto'] text-sm text-muted-foreground">
                        {formatDateVN(job.postedDate) || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Xem chi tiết"
                            aria-label="Xem chi tiết"
                            onClick={() => openJobDetail(job)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                title="Thao tác"
                                aria-label="Thao tác"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 min-w-[12rem] font-['Roboto']"
                            >
                              <DropdownMenuItem
                                disabled={job.status === "active"}
                                onClick={() =>
                                  updateJobStatusDirect(job.id, "active")
                                }
                                className="gap-2"
                              >
                                <span className="inline-block size-2 rounded-full bg-green-500" />
                                Xuất bản
                                {job.status === "active" && (
                                  <Check className="ml-auto size-3 text-green-600" />
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={job.status === "closed"}
                                onClick={() =>
                                  updateJobStatusDirect(job.id, "closed")
                                }
                                className="gap-2"
                              >
                                <span className="inline-block size-2 rounded-full bg-red-500" />
                                Đóng
                                {job.status === "closed" && (
                                  <Check className="ml-auto size-3 text-red-600" />
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={job.status === "inactive"}
                                onClick={() =>
                                  updateJobStatusDirect(job.id, "inactive")
                                }
                                className="gap-2"
                              >
                                <span className="inline-block size-2 rounded-full bg-muted-foreground" />
                                Lưu trữ
                                {job.status === "inactive" && (
                                  <Check className="ml-auto size-3 text-muted-foreground" />
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
            loading={loading}
            totalItems={pagination.totalItems}
            limit={pagination.limit || limit}
            itemLabel="việc làm"
          />
        </Card>

        <AdminModal
          open={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title="Chi tiết việc làm"
          size="2xl"
          footer={
            <div className="flex justify-end">
              <Button
                type="button"
                className="px-5 py-2.5 text-sm"
                onClick={() => setSelectedJob(null)}
              >
                Đóng
              </Button>
            </div>
          }
        >
          {selectedJob && (
            <>
              <div className="mb-6 space-y-6">
                <div className="flex justify-end">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-['Roboto'] font-normal",
                      getStatusColor(selectedJob.status),
                    )}
                  >
                    {getStatusLabel(selectedJob.status)}
                  </Badge>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-['Open_Sans'] text-lg font-medium text-foreground">
                      {selectedJob.title}
                    </h4>
                    <p className="font-['Roboto'] text-sm text-muted-foreground">
                      {selectedJob.department} • {selectedJob.location}
                    </p>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground font-['Roboto']">
                        Đăng bởi:
                      </span>
                      <p className="text-foreground font-['Roboto']">
                        {selectedJob.postedBy}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground font-['Roboto']">
                        Loại:
                      </span>
                      <p className="text-foreground font-['Roboto']">
                        {selectedJob.type}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-muted-foreground font-['Roboto']">
                        Lương:
                      </span>
                      <p className="mt-0.5 text-foreground font-['Roboto']">
                        {selectedJob.salary}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h5 className="mb-2 font-['Roboto'] font-medium text-foreground">
                    Thống kê đơn ứng tuyển
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                        {selectedJob.applicationStats?.total ??
                          selectedJob.applications}
                      </p>
                      <p className="font-['Roboto'] text-xs text-muted-foreground">
                        Đã nộp
                      </p>
                    </div>
                    <div>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">
                        {selectedJob.applicationStats?.interviewPassed ??
                          selectedJob.interviewPassed ??
                          0}
                      </p>
                      <p className="font-['Roboto'] text-xs text-muted-foreground">
                        Pass phỏng vấn (đạt)
                      </p>
                    </div>
                  </div>
                  {selectedJob.applicationStats?.byStatus && (
                    <div className="grid grid-cols-2 gap-2 font-['Roboto'] text-xs text-muted-foreground">
                      {Object.entries(selectedJob.applicationStats.byStatus)
                        .filter(([, v]) => v && v > 0)
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span>{getApplicationStatusLabel(k)}</span>
                            <span className="font-medium text-foreground">
                              {v}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-8">
                  <div className="space-y-3">
                    <h5 className="font-['Roboto'] text-sm font-semibold tracking-wide text-foreground">
                      Thông tin cơ bản
                    </h5>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-['Roboto'] text-sm">
                      <div>
                        <dt className="text-muted-foreground">Kinh nghiệm</dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.experienceLevel || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Loại địa điểm</dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.locationType || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Hạn nộp</dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.applicationDeadline
                            ? formatDateVN(selectedJob.applicationDeadline) ||
                              "—"
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">
                          Số ứng viên tối đa
                        </dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.maxApplicants || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Lượt xem</dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.views ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Ngày tạo</dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.createdAt
                            ? formatDateVN(selectedJob.createdAt) || "—"
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Ngày xuất bản</dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.publishedAt
                            ? formatDateVN(selectedJob.publishedAt) || "—"
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Yêu cầu hồ sơ</dt>
                        <dd className="font-medium text-foreground">
                          {selectedJob.resumeRequired ? "Có" : "Không"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {selectedJob.qualification?.length > 0 && (
                    <div>
                      <h5 className="mb-2 font-['Roboto'] text-sm font-semibold text-foreground">
                        Bằng cấp
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.qualification.map((q) => (
                          <Badge
                            key={q}
                            variant="secondary"
                            className="font-['Roboto'] font-normal"
                          >
                            {q}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(selectedJob.requiredSkills?.length > 0 ||
                    selectedJob.preferredSkills?.length > 0) && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedJob.requiredSkills?.length > 0 && (
                        <div>
                          <h5 className="mb-2 font-['Roboto'] text-sm font-semibold text-foreground">
                            Kỹ năng bắt buộc
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {selectedJob.requiredSkills.map((s) => (
                              <Badge
                                key={s}
                                variant="secondary"
                                className="font-['Roboto'] font-normal"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedJob.preferredSkills?.length > 0 && (
                        <div>
                          <h5 className="mb-2 font-['Roboto'] text-sm font-semibold text-foreground">
                            Kỹ năng ưu tiên
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {selectedJob.preferredSkills.map((s) => (
                              <Badge
                                key={s}
                                variant="outline"
                                className="font-['Roboto'] font-normal"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedJob.defaultInterviewRounds?.length > 0 && (
                    <div>
                      <h5 className="mb-2 font-['Roboto'] text-sm font-semibold text-foreground">
                        Vòng phỏng vấn
                      </h5>
                      <ol className="list-inside list-decimal space-y-1 font-['Roboto'] text-sm text-foreground">
                        {selectedJob.defaultInterviewRounds.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {selectedJob.description && (
                    <div>
                      <h5 className="mb-2 font-['Roboto'] text-sm font-semibold text-foreground">
                        Mô tả
                      </h5>
                      <p className="font-['Roboto'] text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                        {selectedJob.description}
                      </p>
                    </div>
                  )}
                  {selectedJob.salaryRange &&
                    (selectedJob.salaryRange.min ||
                      selectedJob.salaryRange.max) && (
                      <div>
                        <h5 className="mb-2 font-['Roboto'] text-sm font-semibold text-foreground">
                          Chi tiết lương
                        </h5>
                        <p className="font-['Roboto'] text-sm text-foreground">
                          {selectedJob.salaryRange.min
                            ? selectedJob.salaryRange.min
                            : ""}
                          {selectedJob.salaryRange.min &&
                          selectedJob.salaryRange.max
                            ? " - "
                            : ""}
                          {selectedJob.salaryRange.max
                            ? selectedJob.salaryRange.max
                            : ""}
                          {selectedJob.salaryRange.currency
                            ? ` ${selectedJob.salaryRange.currency}`
                            : ""}
                          {selectedJob.salaryRange.period
                            ? ` / ${selectedJob.salaryRange.period}`
                            : ""}
                          {selectedJob.salaryRange.format
                            ? ` (${selectedJob.salaryRange.format})`
                            : ""}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </>
          )}
        </AdminModal>
      </div>
    </AdminLayout>
  );
};
export default AllJobsPage;
