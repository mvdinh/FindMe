import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { getApiUrl } from "../../utils/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "../../components/common/Pagination";
import { getRecruitmentCode } from "../../utils/recruitmentCode";
import {
  MapPin,
  Globe,
  Users,
  Building2,
  Briefcase,
  AlertCircle,
  FileText,
  BadgeCheck,
  Search,
  CheckCircle2,
  Heart
} from "lucide-react";

const PAGE_SIZE = 5;

const CompanyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiRequest, user } = useAuth();
  const toast = useToast();
  
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPagination, setJobsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: PAGE_SIZE,
  });
  
  // Search state for jobs within this company
  const [jobSearchTerm, setJobSearchTerm] = useState("");
  const [debouncedJobSearch, setDebouncedJobSearch] = useState("");
  const [savedJobIds, setSavedJobIds] = useState([]);

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedJobSearch(jobSearchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [jobSearchTerm]);

  const fetchCompanyDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest(`/api/companies/${id}`);
      const data = await response.json();
      if (data.success) {
        setCompany(data.data);
      } else {
        setError(data.message || "Không thể tải thông tin công ty.");
      }
    } catch (err) {
      console.error("Error fetching company details:", err);
      setError("Đã có lỗi xảy ra khi tải thông tin công ty.");
    } finally {
      setLoading(false);
    }
  }, [id, apiRequest]);

  const fetchCompanyJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      setJobsError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
        company: id,
        status: "active"
      });
      
      if (debouncedJobSearch.trim()) {
        params.append("search", debouncedJobSearch.trim());
      }
      
      const response = await apiRequest(`/api/jobs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.data.jobs);
        setJobsPagination({
          currentPage: data.data.pagination.currentPage,
          totalPages: data.data.pagination.totalPages,
          total: data.data.pagination.totalJobs || data.data.pagination.total || 0,
          limit: data.data.pagination.limit
        });
      } else {
        setJobsError(data.message || "Không thể tải danh sách việc làm.");
      }
    } catch (err) {
      console.error("Error fetching company jobs:", err);
      setJobsError("Đã có lỗi xảy ra khi tải danh sách việc làm.");
    } finally {
      setLoadingJobs(false);
    }
  }, [id, currentPage, debouncedJobSearch, apiRequest]);

  const fetchSavedJobs = useCallback(async () => {
    if (!user || user.role !== "applicant") return;
    try {
      const res = await apiRequest("/api/applicant/saved-jobs");
      const data = await res.json();
      if (data.success) {
        setSavedJobIds(data.data.map((job) => job.id || job._id));
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách việc làm đã lưu:", error);
    }
  }, [user, apiRequest]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  useEffect(() => {
    fetchCompanyJobs();
  }, [fetchCompanyJobs]);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const toggleSaveJob = async (e, jobId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }

    const isSaved = savedJobIds.includes(jobId);

    // Optimistic UI update
    if (isSaved) {
      setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
      apiRequest(`/api/applicant/saved-jobs/${jobId}`, {
        method: "DELETE",
      })
        .then((res) => {
          if (res.ok) toast.info("Đã bỏ lưu việc làm");
          else throw new Error("Failed to unsave");
        })
        .catch(() => {
          setSavedJobIds((prev) => [...prev, jobId]);
          toast.error("Không thể bỏ lưu, vui lòng thử lại");
        });
    } else {
      setSavedJobIds((prev) => [...prev, jobId]);
      apiRequest(`/api/applicant/saved-jobs/${jobId}`, {
        method: "POST",
      })
        .then((res) => {
          if (res.ok) toast.success("Đã lưu việc làm thành công");
          else throw new Error("Failed to save");
        })
        .catch(() => {
          setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
          toast.error("Không thể lưu, vui lòng thử lại");
        });
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen pt-20 pb-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-64 w-full rounded-b-xl mb-[-4rem]" />
          <Skeleton className="h-48 w-full rounded-xl mx-auto relative z-10" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="bg-gray-50 min-h-screen pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error || "Không tìm thấy công ty."}</AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => navigate("/companies")}>
              Quay lại danh sách công ty
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const logoUrl = company.logo
    ? company.logo.startsWith("/uploads")
      ? `${getApiUrl()}${company.logo}`
      : company.logo
    : null;

  return (
    <div className="bg-slate-50/50 min-h-screen pt-24 pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main Header Card */}
        <Card className="shadow-md border border-border/40 overflow-hidden bg-white rounded-2xl mb-8">
          <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:items-center text-center md:text-left">
            <div className="shrink-0 w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white border border-border shadow-md flex items-center justify-center overflow-hidden mx-auto md:mx-0 p-2.5">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={company.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Building2 className="size-14 text-gray-300" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-['Open_Sans'] mb-3">
                {company.name}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-['Roboto']">
                {company.website && (
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/40 text-muted-foreground transition-all duration-200"
                  >
                    <Globe className="size-4" />
                    <span className="font-medium">{company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </a>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary">
                  <Users className="size-4" />
                  <span className="font-semibold">{jobsPagination.total} việc làm đang tuyển</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-sm border-0 border-t-4 border-t-red-600 bg-white">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 font-['Open_Sans'] mb-6">
                  Giới thiệu công ty
                </h2>
                <div 
                  className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed font-['Roboto']"
                  dangerouslySetInnerHTML={{ __html: company.description || "Chưa có thông tin giới thiệu." }}
                />
              </div>
            </Card>

            <Card className="shadow-sm border-0 border-t-4 border-t-red-600 bg-white">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 font-['Open_Sans']">
                      Tin tuyển dụng
                    </h2>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm việc làm..."
                        value={jobSearchTerm}
                        onChange={(e) => setJobSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-['Roboto']"
                      />
                    </div>
                  </div>

                  {loadingJobs ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : jobsError ? (
                    <p className="text-red-500 text-sm">{jobsError}</p>
                  ) : jobs.length > 0 ? (
                    <div className="space-y-4">
                      {jobs.map((job) => (
                        <Link key={job.id} to={`/jobs/${job.id}`} className="block group">
                          <Card className="cursor-pointer shadow-sm transition-all hover:ring-red-500 hover:shadow-md hover:border-transparent flex flex-col rounded-xl overflow-hidden group">
                            <CardContent className="p-3 sm:p-4 flex flex-col h-full justify-between">
                              {/* Top Section */}
                              <div className="flex items-start gap-3 mb-3">
                                <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-gray-200 p-1 flex items-center justify-center overflow-hidden bg-white">
                                  {(() => {
                                    const hasLogo =
                                      job.companyLogo ||
                                      (job.company && job.company.logo);
                                    const rawLogo =
                                      job.companyLogo || job.company?.logo;
                                    const logoSrc =
                                      rawLogo && rawLogo.startsWith("/uploads/")
                                        ? `${getApiUrl()}${rawLogo}`
                                        : rawLogo;
                                    return hasLogo ? (
                                      <img
                                        src={logoSrc}
                                        alt={`${(typeof job.company === "string" ? job.company : job.company?.name) || "Company"} logo`}
                                        className="w-full h-full object-contain"
                                        onLoad={(e) => {
                                          e.target.style.display = "block";
                                          const fallback = e.target.parentElement.querySelector(".logo-fallback");
                                          if (fallback) fallback.style.display = "none";
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = "none";
                                          const fallback =
                                            e.target.parentElement.querySelector(
                                              ".logo-fallback",
                                            );
                                          if (fallback)
                                            fallback.style.display = "flex";
                                        }}
                                      />
                                    ) : null;
                                  })()}
                                  <div
                                    className={`logo-fallback flex h-full w-full items-center justify-center text-lg font-bold text-gray-400 bg-gray-50 rounded-md ${
                                      job.companyLogo || (job.company && job.company.logo)
                                        ? "hidden"
                                        : "flex"
                                    }`}
                                  >
                                    {(
                                      (typeof job.company === "string"
                                        ? job.company
                                        : job.company?.name) || "Company"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-['Open_Sans'] text-lg sm:text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug mb-1">
                                    {job.title}
                                  </h3>
                                  <p className="text-sm text-gray-500 truncate font-['Roboto']">
                                    {typeof job.company === "string" ? job.company : job.company?.name || "Company"}
                                  </p>
                                </div>
                              </div>

                              {/* Bottom Section */}
                              <div className="flex items-center justify-between mt-auto pt-2">
                                <div className="flex items-center gap-2 overflow-hidden pr-2">
                                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-md font-medium whitespace-nowrap font-['Roboto']">
                                    {job.salary}
                                  </span>
                                  <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-md font-medium whitespace-nowrap truncate font-['Roboto']">
                                    {job.location}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                                    savedJobIds.includes(job.id)
                                      ? "border-red-500 text-red-500 bg-red-50"
                                      : "border-gray-200 text-gray-400 hover:border-red-500 hover:text-red-500 hover:bg-red-50"
                                  }`}
                                  onClick={(e) => toggleSaveJob(e, job.id)}
                                  title={savedJobIds.includes(job.id) ? "Bỏ lưu" : "Lưu việc làm"}
                                >
                                  <Heart className={`w-4 h-4 ${savedJobIds.includes(job.id) ? "fill-red-500" : ""}`} />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                      
                      {jobsPagination.total > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <Pagination
                            currentPage={jobsPagination.currentPage}
                            totalPages={jobsPagination.totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={jobsPagination.total}
                            limit={jobsPagination.limit}
                            itemLabel="việc làm"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Briefcase className="size-10 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-gray-900 font-medium mb-1">Không có tin tuyển dụng</h3>
                      <p className="text-gray-500 text-sm">Công ty hiện chưa có tin tuyển dụng nào phù hợp với tìm kiếm của bạn.</p>
                    </div>
                  )}
                </div>
              </Card>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-8">
            <Card className="shadow-sm border-0 border-t-4 border-t-red-600 bg-white">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 font-['Open_Sans'] mb-6">
                  Thông tin chung
                </h2>
                
                <div className="space-y-5 font-['Roboto'] text-sm">
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-full shrink-0">
                      <FileText className="size-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">Mã số thuế</p>
                      <p className="font-semibold text-gray-900">{company.taxCode || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-full shrink-0">
                      <Users className="size-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">Quy mô công ty</p>
                      <p className="font-semibold text-gray-900">{company.size || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-50 p-2.5 rounded-full shrink-0">
                      <Briefcase className="size-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-gray-500 mb-0.5">Lĩnh vực hoạt động</p>
                      <p className="font-semibold text-gray-900 leading-snug">{company.industry || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="shadow-sm border-0 border-t-4 border-t-red-600 bg-white">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 font-['Open_Sans'] mb-4">
                  Địa điểm công ty
                </h2>
                <div className="flex items-start gap-3 text-sm font-['Roboto']">
                  <MapPin className="size-5 text-gray-600 shrink-0 mt-0.5" />
                  <p className="text-gray-800 leading-relaxed">
                    {company.address || "Chưa cập nhật địa chỉ"}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailsPage;
