import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  HR_PAGE,
  HR_PAGE_HEADER,
  HR_H1,
  HR_SUBTITLE,
} from "../applicantLayoutClasses";
import { useAuth } from "../../contexts/AuthContext";
import { CACHE_PREFIXES, CACHE_DURATIONS } from "../../utils/cacheUtils";
import { APP_DATA_CACHE_VERSION } from "../../utils/appCacheVersion";
import { smartCacheSet } from "../../utils/cacheManager";
import { formatDateVN } from "@/utils/dateFormat";
import { getRecruitmentCode } from "../../utils/recruitmentCode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Building2,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  UserCheck,
  Send,
} from "lucide-react";

const JobDetailsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const CACHE_DURATION = CACHE_DURATIONS.JOB_DETAILS;
  const JOB_CACHE_KEY_PREFIX = CACHE_PREFIXES.JOB_DETAILS;

  const loadJobFromCache = (jobId) => {
    try {
      const cacheKey = JOB_CACHE_KEY_PREFIX + jobId;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.cacheVersion !== APP_DATA_CACHE_VERSION) {
          localStorage.removeItem(cacheKey);
          return null;
        }
        const now = new Date().getTime();
        if (now - parsedCache.timestamp < CACHE_DURATION) {
          return parsedCache.data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error("Error loading job from cache:", error);
      localStorage.removeItem(JOB_CACHE_KEY_PREFIX + jobId);
    }
    return null;
  };

  const saveJobToCache = (jobId, jobData) => {
    const cacheKey = JOB_CACHE_KEY_PREFIX + jobId;
    const cacheData = {
      cacheVersion: APP_DATA_CACHE_VERSION,
      timestamp: new Date().getTime(),
      data: jobData,
    };
    const success = smartCacheSet(cacheKey, JSON.stringify(cacheData), {
      maxRetries: 2,
      clearOldCaches: true,
      clearAllOnFinalFailure: true,
    });
    if (!success) {
      console.warn("Failed to cache job details after multiple attempts");
    }
  };

  const fetchJobDetails = async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);
      if (useCache) {
        const cachedJob = loadJobFromCache(jobId);
        if (cachedJob) {
          setJob(cachedJob);
          setLoading(false);
          return;
        }
      }
      const response = await apiRequest(`/api/jobs/${jobId}`);
      const data = await response.json();
      if (data.success) {
        setJob(data.data.job);
        saveJobToCache(jobId, data.data.job);
      } else {
        setError(data.message || "Không thể tải chi tiết việc làm");
      }
    } catch (err) {
      console.error("Error fetching job details:", err);
      setError("Không thể tải chi tiết việc làm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const refreshJobDetails = () => {
    fetchJobDetails(false);
  };

  const checkIfJobIsSaved = async () => {
    try {
      const response = await apiRequest("/api/applicant/saved-jobs", {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const isCurrentJobSaved = data.data.some((job) => job.id === jobId);
          setIsSaved(isCurrentJobSaved);
        }
      }
    } catch (error) {
      console.error("Error checking saved job status:", error);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
      checkIfJobIsSaved();
    }
  }, [jobId]);

  const handleApply = () => {
    navigate(`/jobs/${jobId}/apply`);
  };

  const handleSave = async () => {
    if (savingJob) return;
    try {
      setSavingJob(true);
      if (isSaved) {
        const response = await apiRequest(
          `/api/applicant/saved-jobs/${jobId}`,
          {
            method: "DELETE",
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsSaved(false);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error unsaving job:", errorData.message);
        }
      } else {
        const response = await apiRequest(
          `/api/applicant/saved-jobs/${jobId}`,
          {
            method: "POST",
          },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsSaved(true);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error saving job:", errorData.message);
        }
      }
    } catch (error) {
      console.error("Error toggling saved job:", error);
    } finally {
      setSavingJob(false);
    }
  };

  const getRemainingDays = (deadline) => {
    if (!deadline) return "Không có hạn";
    const deadDate = new Date(deadline);
    const today = new Date();
    deadDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = deadDate.getTime() - today.getTime();
    if (diffTime < 0) return "Hết hạn";
    if (diffTime === 0) return "Hôm nay là hạn cuối";
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `Còn ${diffDays} ngày`;
  };

  const JobDetailsSkeleton = () => (
    <div className={`${HR_PAGE} max-w-5xl animate-pulse space-y-6`}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Hero Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="space-y-3 border-t pt-5">
                <Skeleton className="h-6 w-48" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="space-y-3 pt-4 border-t">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 transition-colors duration-300">
      {loading ? (
        <JobDetailsSkeleton />
      ) : error ? (
        <div className={`${HR_PAGE} max-w-5xl space-y-4`}>
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-['Open_Sans']">
              Không tìm thấy việc làm
            </AlertTitle>
            <AlertDescription className="font-['Roboto']">
              {error}
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="font-['Roboto']"
              onClick={refreshJobDetails}
            >
              Thử lại
            </Button>
            <Button variant="secondary" className="font-['Roboto']" asChild>
              <Link to="/jobs">Quay lại danh sách việc làm</Link>
            </Button>
          </div>
        </div>
      ) : job ? (
        <div className={`${HR_PAGE} max-w-5xl space-y-6 pb-12`}>
          {/* Top Breadcrumb Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm font-['Roboto'] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <Link
                to="/"
                className="hover:text-primary transition-colors duration-200"
              >
                Trang chủ
              </Link>
              <ChevronRight className="size-3 shrink-0" />
              <Link
                to="/jobs"
                className="hover:text-primary transition-colors duration-200"
              >
                Việc làm
              </Link>
              <ChevronRight className="size-3 shrink-0" />
              <span className="hover:text-primary transition-colors duration-200">
                {job.department || "Tuyển dụng"}
              </span>
              <ChevronRight className="size-3 shrink-0" />
              <span className="text-foreground font-medium truncate max-w-[150px] md:max-w-xs">
                {job.title}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="font-['Roboto'] gap-2 hover:bg-muted text-xs md:text-sm"
              asChild
            >
              <Link to="/jobs">
                <ArrowLeft className="size-4 shrink-0" />
                Quay lại danh sách
              </Link>
            </Button>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Core Job Details & Description */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Job Core Card */}
              <div className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-6">
                <h1 className="font-['Open_Sans'] text-xl md:text-2xl font-bold text-foreground leading-snug">
                  {job.title}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Salary block */}
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <DollarSign className="size-5 text-primary" />
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground font-['Roboto']">
                        Mức lương
                      </span>
                      <span className="font-['Open_Sans'] text-sm md:text-base font-bold text-foreground">
                        {job.salary && job.salary !== "Not disclosed"
                          ? job.salary
                          : "Thỏa thuận"}
                      </span>
                    </div>
                  </div>

                  {/* Location block */}
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="size-5 text-primary" />
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground font-['Roboto']">
                        Địa điểm
                      </span>
                      <span
                        className="font-['Open_Sans'] text-sm md:text-base font-bold text-foreground truncate block max-w-[160px]"
                        title={job.location}
                      >
                        {job.location || "Hà Nội"}
                      </span>
                    </div>
                  </div>

                  {/* Experience block */}
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Briefcase className="size-5 text-primary" />
                    </div>
                    <div>
                      <span className="block text-xs text-muted-foreground font-['Roboto']">
                        Kinh nghiệm
                      </span>
                      <span className="font-['Open_Sans'] text-sm md:text-base font-bold text-foreground">
                        {job.experience || "Không yêu cầu"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deadline line */}
                <div className="flex items-center gap-2 text-xs md:text-sm font-['Roboto'] text-muted-foreground border-t border-dashed pt-4">
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                  <span>
                    Hạn nộp hồ sơ:{" "}
                    <strong className="text-foreground">
                      {formatDateVN(job.applicationDeadline)}
                    </strong>{" "}
                    <span className="text-primary font-semibold">
                      ({getRemainingDays(job.applicationDeadline)})
                    </span>
                  </span>
                </div>
              </div>

              {/* Chi tiết tin tuyển dụng Card */}
              <Card className="shadow-sm border-border bg-white">
                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Header Title with vertical bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <h2 className="font-['Open_Sans'] text-lg md:text-xl font-bold text-foreground border-l-4 border-primary pl-3">
                      Chi tiết tin tuyển dụng
                    </h2>
                  </div>
                  {/* Job detail sections */}
                  <div className="space-y-6">
                    {/* Mô tả công việc */}
                    {job.description && (
                      <div>
                        <h3 className="font-['Open_Sans'] text-base font-bold text-foreground mb-3">
                          Mô tả công việc
                        </h3>
                        <div className="whitespace-pre-line font-['Roboto'] text-sm md:text-base leading-relaxed text-muted-foreground/90 space-y-2">
                          {job.description}
                        </div>
                      </div>
                    )}

                    {/* Yêu cầu ứng viên */}
                    {job.requirements && job.requirements.trim() && (
                      <div className="border-t border-border pt-5">
                        <h3 className="font-['Open_Sans'] text-base font-bold text-foreground mb-3">
                          Yêu cầu ứng viên
                        </h3>
                        <div className="whitespace-pre-line font-['Roboto'] text-sm md:text-base leading-relaxed text-muted-foreground/90 space-y-2">
                          {job.requirements}
                        </div>
                      </div>
                    )}

                    {/* Yêu cầu bắt buộc */}
                    {((job.qualification && job.qualification.length > 0) ||
                      (job.requiredSkills && job.requiredSkills.length > 0) ||
                      job.experience) && (
                      <div className="border-t border-border pt-5">
                        <h3 className="font-['Open_Sans'] text-base font-bold text-foreground mb-3">
                          Yêu cầu bắt buộc
                        </h3>
                        <ul className="space-y-1.5 font-['Roboto']">
                          {/* Cấp bậc/Kinh nghiệm */}
                          {job.experience && (
                            <li className="flex items-start gap-2.5">
                              <span className="text-sm md:text-base leading-relaxed text-muted-foreground/90 shrink-0 select-none">
                                -
                              </span>
                              <span className="text-sm md:text-base leading-relaxed text-muted-foreground/90">
                                Kinh nghiệm chuyên môn: {job.experience}
                              </span>
                            </li>
                          )}

                          {/* Bằng cấp bắt buộc */}
                          {job.qualification &&
                            job.qualification.length > 0 &&
                            job.qualification.map((q, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2.5 "
                              >
                                <span className="text-sm md:text-base leading-relaxed text-muted-foreground/90 shrink-0 select-none">
                                  -
                                </span>
                                <span className="text-sm md:text-base leading-relaxed text-muted-foreground/90">
                                  Bằng cấp/Học vấn: {q}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Quyền lợi được hưởng */}
                    {job.benefits && job.benefits.trim() && (
                      <div className="border-t border-border pt-5">
                        <h3 className="font-['Open_Sans'] text-base font-bold text-foreground mb-3">
                          Quyền lợi được hưởng
                        </h3>
                        <div className="whitespace-pre-line font-['Roboto'] text-sm md:text-base leading-relaxed text-muted-foreground/90 space-y-2">
                          {job.benefits}
                        </div>
                      </div>
                    )}

                    {/* Place and contract information */}
                    <div className="border-t border-border pt-5 space-y-4">
                      <div>
                        <h3 className="font-['Open_Sans'] text-base font-bold text-foreground mb-2">
                          Địa điểm làm việc
                        </h3>
                        <p className="font-['Roboto'] text-sm md:text-base text-muted-foreground/90">
                          - {job.location || "Hà Nội"}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-['Open_Sans'] text-base font-bold text-foreground mb-2">
                          Cách thức ứng tuyển
                        </h3>
                        <p className="font-['Roboto'] text-sm md:text-base text-muted-foreground/90">
                          Ứng viên nộp hồ sơ trực tuyến bằng cách bấm{" "}
                          <strong>Ứng tuyển ngay</strong> dưới đây.
                        </p>
                        <p className="font-['Roboto'] text-sm text-muted-foreground mt-2">
                          Hạn nhận hồ sơ:{" "}
                          {formatDateVN(job.applicationDeadline)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Repeated bottom buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                    <Button
                      type="button"
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-['Roboto'] font-bold text-base min-h-12 gap-2 shadow-sm rounded-lg transition-colors duration-200"
                      disabled={job.hasApplied}
                      onClick={handleApply}
                    >
                      <Send className="size-4 shrink-0 fill-white" />
                      {job.hasApplied ? "Đã nộp hồ sơ" : "Ứng tuyển ngay"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary hover:bg-primary/5 text-primary font-['Roboto'] font-semibold text-base min-h-12 gap-2 rounded-lg transition-colors duration-200"
                      disabled={savingJob}
                      onClick={handleSave}
                    >
                      {savingJob ? (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      ) : (
                        <Heart
                          className={`size-5 transition-transform duration-200 ${isSaved ? "fill-primary text-primary scale-110" : ""}`}
                        />
                      )}
                      {isSaved ? "Đã lưu tin" : "Lưu tin"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar Widget (General Info only) */}
            <div className="space-y-6">
              {/* Thông tin chung Widget */}
              <Card className="shadow-sm border-border overflow-hidden bg-white">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-['Open_Sans'] text-base font-bold text-foreground pb-2 border-b border-border">
                    Thông tin chung
                  </h3>

                  <div className="space-y-4">
                    {/* Cấp bậc */}
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                        <UserCheck className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground font-['Roboto']">
                          Cấp bậc
                        </span>
                        <span className="font-['Roboto'] text-sm font-semibold text-foreground">
                          Nhân viên
                        </span>
                      </div>
                    </div>

                    {/* Học vấn */}
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                        <GraduationCap className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground font-['Roboto']">
                          Học vấn
                        </span>
                        <span className="font-['Roboto'] text-sm font-semibold text-foreground">
                          {job.qualification?.join(", ") || "Đại học trở lên"}
                        </span>
                      </div>
                    </div>

                    {/* Số lượng tuyển */}
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                        <Users className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground font-['Roboto']">
                          Số lượng tuyển
                        </span>
                        <span className="font-['Roboto'] text-sm font-semibold text-foreground">
                          {job.maxApplicants
                            ? `${job.maxApplicants} người`
                            : "10 người"}
                        </span>
                      </div>
                    </div>

                    {/* Loại hình làm việc */}
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                        <Clock className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="block text-xs text-muted-foreground font-['Roboto']">
                          Hình thức làm việc
                        </span>
                        <span className="font-['Roboto'] text-sm font-semibold text-foreground">
                          {job.workType || job.jobType || "Toàn thời gian"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default JobDetailsPage;
