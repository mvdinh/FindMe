import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import {
  ADMIN_PAGE,
  ADMIN_PAGE_HEADER,
  ADMIN_H1,
  ADMIN_SUBTITLE,
  ADMIN_NATIVE_FIELD,
  HR_TABLE_WRAP,
} from "../adminLayoutClasses";
import { formatDateVN } from "@/utils/dateFormat";
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
  Calendar,
} from "lucide-react";
import { useApiRequest } from "../../hooks/useApiRequest";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const AllJobsPage = () => {
  const navigate = useNavigate();
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
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
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
    if (deadlineFrom) params.push(`deadlineFrom=${encodeURIComponent(deadlineFrom)}`);
    if (deadlineTo) params.push(`deadlineTo=${encodeURIComponent(deadlineTo)}`);
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
    deadlineFrom,
    deadlineTo,
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
        ["Remote", "Hybrid"].forEach((opt) => {
          if (!lower.includes(opt.toLowerCase())) incomingJobTypes.push(opt);
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
    deadlineFrom,
    deadlineTo,
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
    navigate(`/admin/jobs/${job.id}`);
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
      case "closed":
        return "border-destructive/30 bg-destructive/10 text-destructive";
      case "draft":
        return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";

      default:
        return "border-border bg-muted text-foreground";
    }
  };
  const getStatusLabel = (status) => {
    const map = {
      active: "đang hoạt động",
      closed: "đã đóng",
      draft: "bản nháp",

    };
    return map[status] || status;
  };
  const getApplicationStatusLabel = (status) => {
    const s = (status || "").toString().toLowerCase();
    const map = {
      submitted: "Đã nộp",
      under_review: "Chờ xét duyệt",
      shortlisted: "Chờ xét duyệt",
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
  const closedJobs = totals?.closedJobs ?? 0;
  return (
    <AdminLayout>
      <div className={ADMIN_PAGE}>
        <div className={ADMIN_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={ADMIN_H1}>Quản lý tin tuyển dụng</h1>
            <p className={ADMIN_SUBTITLE}>
              Theo dõi tất cả tin tuyển dụng
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

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 px-4 py-2">
              <div className="rounded-lg bg-primary/10 p-2 ring-1 ring-primary/20">
                <svg
                  className="size-5 stroke-current text-primary"
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
                  Số tin tuyển dụng
                </p>
                <p className="font-['Open_Sans'] text-2xl font-bold text-foreground leading-none mt-1">
                  {totalJobs}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 px-4 py-2">
              <div className="rounded-lg bg-sky-500/10 p-2 ring-1 ring-sky-500/20">
                <svg
                  className="size-5 stroke-current text-sky-600"
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
                  Số tin hoạt động
                </p>
                <p className="font-['Open_Sans'] text-2xl font-bold text-foreground leading-none mt-1">
                  {activeJobs}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 px-4 py-2">
              <div className="rounded-lg bg-blue-500/10 p-2 ring-1 ring-blue-500/20">
                <svg
                  className="size-5 stroke-current text-blue-600"
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
                  Số tin đã đóng
                </p>
                <p className="font-['Open_Sans'] text-2xl font-bold text-foreground leading-none mt-1">
                  {closedJobs}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-3 shadow-sm">
          <CardContent className="py-2 px-3 space-y-2">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full md:w-[300px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm tiêu đề, công ty..."
                      className="min-h-10 pl-10 font-['Roboto'] text-sm"
                    />
                  </div>
                  {["all", "active", "closed", "draft"].map((s) => (
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
                              ? "Chờ phê duyệt"
                              : s}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-['Roboto'] text-destructive hover:text-destructive shrink-0"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterPostedById("all");
                    setFilterDepartment("all");
                    setFilterJobType("all");
                    setFromDate("");
                    setToDate("");
                    setDeadlineFrom("");
                    setDeadlineTo("");
                    setSortBy("createdAt");
                    setSortOrder("desc");
                    setPage(1);
                  }}
                >
                  Xóa lọc
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Label className="font-['Roboto'] text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Ngày đăng:
                  </Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-8 w-[130px] font-['Roboto'] text-xs"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-8 w-[130px] font-['Roboto'] text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="font-['Roboto'] text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Ngày hết hạn:
                  </Label>
                  <Input
                    type="date"
                    value={deadlineFrom}
                    onChange={(e) => setDeadlineFrom(e.target.value)}
                    className="h-8 w-[130px] font-['Roboto'] text-xs"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={deadlineTo}
                    onChange={(e) => setDeadlineTo(e.target.value)}
                    className="h-8 w-[130px] font-['Roboto'] text-xs"
                  />
                </div>
              </div>
            </div>

            
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
                      Tin tuyển dụng
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Nhà tuyển dụng
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ngày đăng tin
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ngày hết hạn
                    </TableHead>
                    <TableHead className="px-6 font-['Roboto'] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Trạng thái
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
                          
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="font-['Open_Sans'] text-sm font-medium text-foreground">
                          {job.company}
                        </div>
                        
                      </TableCell>
                      <TableCell className="px-6 py-4 font-['Roboto'] text-sm text-muted-foreground">
                        {formatDateVN(job.postedDate) || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-['Roboto'] text-sm text-muted-foreground">
                        {formatDateVN(job.deadline) || "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-['Roboto'] font-normal whitespace-nowrap",
                            getStatusColor(job.status),
                          )}
                        >
                          {getStatusLabel(job.status)}
                        </Badge>
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
                                disabled={job.status === "closed"}
                                onClick={() =>
                                  updateJobStatusDirect(job.id, "closed")
                                }
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <span className="inline-block size-2 rounded-full bg-red-500" />
                                Đóng tin
                                {job.status === "closed" && (
                                  <Check className="ml-auto size-3 text-red-600" />
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={job.status === "active"}
                                onClick={() =>
                                  updateJobStatusDirect(job.id, "active")
                                }
                                className="gap-2"
                              >
                                <span className="inline-block size-2 rounded-full bg-green-500" />
                                Kích hoạt
                                {job.status === "active" && (
                                  <Check className="ml-auto size-3 text-green-600" />
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
      </div>
    </AdminLayout>
  );
};
export default AllJobsPage;
