import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  HR_PAGE,
  HR_PAGE_HEADER,
  HR_H1,
  HR_SUBTITLE,
} from "../applicantLayoutClasses";
import { HR_FILTER_CONTROL } from "../applicantFormClasses";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { CACHE_PREFIXES, CACHE_DURATIONS } from "../../utils/cacheUtils";
import { APP_DATA_CACHE_VERSION } from "../../utils/appCacheVersion";
import { smartCacheSet } from "../../utils/cacheManager";
import { getApiUrl } from "../../utils/api";
import { getRecruitmentCode } from "../../utils/recruitmentCode";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from "../../components/common/Pagination";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Filter,
  Heart,
} from "lucide-react";

const PAGE_SIZE = 9;
const JobSearchPage = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKeyword = searchParams.get("keyword") || "";
  const initialLocation = searchParams.get("location") || "";

  const [searchTerm, setSearchTerm] = useState(initialKeyword);
  const [filters, setFilters] = useState({
    workType: "",
    jobType: "",
    location: initialLocation,
    experience: "",
    salary: "",
  });
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState(initialKeyword);
  const [submittedLocation, setSubmittedLocation] = useState(initialLocation);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalJobs: 0,
    limit: PAGE_SIZE,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [savedJobIds, setSavedJobIds] = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesPagination, setCompaniesPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 8,
  });
  const CACHE_DURATION = CACHE_DURATIONS.JOBS;
  const CACHE_KEY_PREFIX = CACHE_PREFIXES.JOBS;
  const getCacheKey = (searchTerm, filtersObj, page) => {
    const searchParams = {
      search: searchTerm,
      ...filtersObj,
      page: page,
      limit: PAGE_SIZE,
    };
    const sortedParams = Object.keys(searchParams)
      .sort()
      .reduce((result, key) => {
        if (searchParams[key]) {
          result[key] = searchParams[key];
        }
        return result;
      }, {});
    try {
      const paramString = JSON.stringify(sortedParams);
      const cacheKey = CACHE_KEY_PREFIX + btoa(encodeURIComponent(paramString));
      return cacheKey;
    } catch (error) {
      console.error("Error generating cache key:", error);
      const fallbackKey = JSON.stringify(sortedParams).replace(
        /[^a-zA-Z0-9]/g,
        "_",
      );
      const cacheKey = CACHE_KEY_PREFIX + fallbackKey;
      return cacheKey;
    }
  };
  const loadFromCache = (cacheKey) => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.cacheVersion !== APP_DATA_CACHE_VERSION) {
          localStorage.removeItem(cacheKey);
          return null;
        }
        const now = new Date().getTime();
        const isValid = parsedCache.expiry
          ? now < parsedCache.expiry
          : now - parsedCache.timestamp < CACHE_DURATION;
        if (isValid) {
          return parsedCache.data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error("Error loading from cache:", error);
      localStorage.removeItem(cacheKey);
    }
    return null;
  };
  const saveToCache = (cacheKey, data) => {
    try {
      const cacheData = {
        cacheVersion: APP_DATA_CACHE_VERSION,
        timestamp: new Date().getTime(),
        expiry: new Date().getTime() + 5 * 60 * 1000,
        data: data,
      };
      const dataSize = JSON.stringify(cacheData).length;
      if (dataSize > 2000000) {
        console.warn("Jobs data too large for cache, creating minimal version");
        const minimalData = {
          cacheVersion: APP_DATA_CACHE_VERSION,
          ...cacheData,
          data: {
            ...data,
            jobs: data.jobs.map((job) => ({
              ...job,
              companyLogo: null,
            })),
          },
        };
        smartCacheSet(cacheKey, JSON.stringify(minimalData), {
          maxRetries: 1,
          clearOldCaches: true,
          clearAllOnFinalFailure: false,
        });
        return;
      }
      const success = smartCacheSet(cacheKey, JSON.stringify(cacheData), {
        maxRetries: 2,
        clearOldCaches: true,
        clearAllOnFinalFailure: false,
      });
      if (!success) {
        const minimalData = {
          cacheVersion: APP_DATA_CACHE_VERSION,
          timestamp: new Date().getTime(),
          expiry: new Date().getTime() + 5 * 60 * 1000,
          data: {
            jobs: Array.isArray(data.jobs) ? data.jobs : [],
            pagination: data.pagination,
          },
        };
        smartCacheSet(cacheKey, JSON.stringify(minimalData), {
          maxRetries: 1,
          clearOldCaches: true,
          clearAllOnFinalFailure: false,
        });
      }
    } catch (error) {
      console.error("Error in saveToCache:", error);
    }
  };

  const fetchJobs = useCallback(
    async (useCache = true) => {
      try {
        setLoading(true);
        setError(null);
        const cacheKey = getCacheKey(submittedSearchTerm, { ...filters, location: submittedLocation }, currentPage);
        if (useCache) {
          const cachedData = loadFromCache(cacheKey);
          if (cachedData) {
            setJobs(cachedData.jobs);
            setPagination(cachedData.pagination);
            setLoading(false);
            return;
          }
        }
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: PAGE_SIZE.toString(),
        });
        if (submittedSearchTerm.trim()) {
          params.append("search", submittedSearchTerm.trim());
        }
        if (filters.workType) params.append("workType", filters.workType);
        if (filters.jobType) params.append("jobType", filters.jobType);
        if (filters.experience)
          params.append("experienceLevel", filters.experience);
        if (submittedLocation) params.append("location", submittedLocation);
        const response = await apiRequest(`/api/jobs?${params}`);
        const data = await response.json();
        if (data.success) {
          const responseData = {
            jobs: data.data.jobs,
            pagination: data.data.pagination,
          };
          setJobs(responseData.jobs);
          setPagination({
            ...responseData.pagination,
            limit: responseData.pagination?.limit ?? PAGE_SIZE,
          });
          const cacheData = {
            jobs: data.data.jobs.map((job) => ({
              id: job.id,
              title: job.title,
              company: job.company,
              companyLogo: job.companyLogo,
              location: job.location,
              workType: job.workType,
              jobType: job.jobType,
              experience: job.experience,
              salary: job.salary,
              postedDate: job.postedDate,
              country: job.country,
            })),
            pagination: data.data.pagination,
          };
          saveToCache(cacheKey, cacheData);
        } else {
          setError(data.message || "Không thể tải danh sách việc làm");
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("Không thể tải danh sách việc làm. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [submittedSearchTerm, submittedLocation, filters.workType, filters.jobType, filters.experience, currentPage, apiRequest],
  );

  const fetchTopCompanies = useCallback(
    async (page = 1) => {
      try {
        setLoadingCompanies(true);
        const response = await apiRequest(
          `/api/companies?limit=8&page=${page}`,
        );
        const data = await response.json();
        if (data.success) {
          setTopCompanies(data.data);
          if (data.pagination) setCompaniesPagination(data.pagination);
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setLoadingCompanies(false);
      }
    },
    [apiRequest],
  );

  const fetchSavedJobs = useCallback(async () => {
    try {
      const response = await apiRequest("/api/applicant/saved-jobs", {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedJobIds(data.data.map((job) => job.id));
        }
      }
    } catch (err) {
      console.error("Error fetching saved jobs:", err);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [submittedSearchTerm, submittedLocation, filters.workType, filters.jobType, filters.experience]);
  useEffect(() => {
    fetchJobs();
  }, [submittedSearchTerm, submittedLocation, filters.workType, filters.jobType, filters.experience, currentPage, fetchJobs]);

  useEffect(() => {
    fetchTopCompanies(companiesPage);
  }, [companiesPage, fetchTopCompanies]);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);
  const totalJobs = pagination.totalJobs;
  const totalPages = pagination.totalPages;
  const pageLimit = pagination.limit || PAGE_SIZE;
  const filteredJobs = jobs;
  const handleJobClick = (jobId) => {
    navigate(`/jobs/${jobId}`);
  };
  const handleApply = (e, jobId) => {
    e.stopPropagation();
    navigate(`/jobs/${jobId}/apply`);
  };
  const toggleSaveJob = async (e, jobId) => {
    e.stopPropagation();
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
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setSubmittedSearchTerm(searchTerm);
    setSubmittedLocation(filters.location);
    const params = new URLSearchParams();
    if (searchTerm) params.set("keyword", searchTerm);
    if (filters.location) params.set("location", filters.location);
    setSearchParams(params);
  };
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };
  const handleSingleSelectFilter = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };
  const clearAllFilters = () => {
    setFilters({
      workType: "",
      jobType: "",
      location: "",
      experience: "",
      salary: "",
    });
    setSearchTerm("");
    setSubmittedSearchTerm("");
    setSubmittedLocation("");
    setSearchParams(new URLSearchParams());
  };
  const refreshJobs = useCallback(() => {
    fetchJobs(false);
  }, [fetchJobs]);
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.workType) count++;
    if (filters.jobType) count++;
    if (filters.location) count++;
    if (filters.experience) count++;
    return count;
  };
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Hero Banner Section */}
      <div className="relative bg-gradient-to-r from-red-800 to-red-600 pt-32 pb-24 mb-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[30%] -right-[10%] w-[50%] h-[150%] bg-white/5 rotate-12 transform-gpu blur-3xl"></div>
          <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[100%] bg-black/10 -rotate-12 transform-gpu blur-2xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight font-['Open_Sans'] mb-4">
            Tìm việc làm nhanh 24h, việc làm mới nhất trên toàn quốc
          </h1>
          <p className="text-lg text-red-100 font-['Roboto'] max-w-3xl mx-auto mb-10">
            Tiếp cận hàng nghìn tin tuyển dụng việc làm mỗi ngày từ hàng nghìn
            doanh nghiệp uy tín tại Việt Nam
          </p>

          {/* Search Box */}
          <form 
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-full p-2 flex flex-col md:flex-row items-center gap-2 max-w-5xl mx-auto shadow-2xl"
          >
            <div className="flex-[7] flex items-center px-4 w-full md:w-auto border-b md:border-b-0 md:border-r border-gray-200">
              <Search className="size-5 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Tên công việc, vị trí..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full border-0 focus:ring-0 text-base py-3 px-3 text-gray-900 placeholder:text-gray-500 font-['Roboto'] outline-none bg-transparent"
              />
            </div>

            <div className="flex-[3] flex items-center px-4 w-full md:w-auto">
              <MapPin className="size-5 text-gray-400 shrink-0" />
              <select
                value={filters.location}
                onChange={(e) =>
                  handleSingleSelectFilter("location", e.target.value)
                }
                className="w-full border-0 focus:ring-0 text-base py-3 px-3 text-gray-900 font-['Roboto'] outline-none bg-transparent appearance-none cursor-pointer"
              >
                <option value="">Tất cả địa điểm</option>
                <option value="Hà Nội">Hà Nội</option>
                <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                <option value="Đà Nẵng">Đà Nẵng</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full md:w-auto rounded-full bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-base font-bold shadow-md transition-transform active:scale-95"
            >
              Tìm kiếm
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm text-red-100">
            <span className="font-medium mr-2">Gợi ý:</span>
            {[
              "Frontend",
              "Backend",
              "ReactJS",
              "NodeJS",
              "Nhân viên kinh doanh",
              "Marketing",
            ].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearchTerm(tag)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/20 text-white"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Job List */}
          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold font-['Open_Sans'] text-gray-900 border-l-4 border-red-600 pl-3">
                Việc làm tuyển dụng
              </h2>
              {!loading && !error && (
                <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {totalJobs.toLocaleString()} kết quả
                </span>
              )}
            </div>

            <Card className="mb-6 shadow-sm border-0 ring-1 ring-gray-200">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-gray-500 mr-2">
                    Lọc thêm:
                  </span>
                  {Object.keys(filters).map((filterType) => {
                    if (filterType === "location") return null; // Already in hero
                    let options = [];
                    let label = "";
                    switch (filterType) {
                      case "workType":
                        label = "Hình thức";
                        options = ["Remote", "Hybrid", "Onsite"];
                        break;
                      case "jobType":
                        label = "Loại CV";
                        options = [
                          "Full-time",
                          "Part-time",
                          "Contract",
                          "Intern",
                          "Freelance",
                        ];
                        break;
                      case "experience":
                        label = "Kinh nghiệm";
                        options = [
                          "Fresher",
                          "Junior",
                          "Middle",
                          "Senior",
                          "Tech Lead",
                          "Manager",
                          "Director",
                        ];
                        break;
                      case "salary":
                        return null;
                      default:
                        return null;
                    }
                    return (
                      <select
                        key={filterType}
                        value={filters[filterType]}
                        onChange={(e) =>
                          handleSingleSelectFilter(filterType, e.target.value)
                        }
                        className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-100"
                      >
                        <option value="">{label}</option>
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    );
                  })}

                  {getActiveFilterCount() > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={clearAllFilters}
                    >
                      Xoá lọc
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mb-8">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...Array(9)].map((_, index) => (
                    <Card key={index} className="shadow-sm">
                      <CardContent className="space-y-3 p-6">
                        <Skeleton className="h-5 w-3/4 max-w-lg" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="space-y-4">
                  <Alert variant="destructive" className="mx-auto max-w-xl">
                    <AlertCircle className="size-4" />
                    <AlertTitle className="font-['Open_Sans']">
                      Không thể tải việc làm
                    </AlertTitle>
                    <AlertDescription className="font-['Roboto']">
                      {error}
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      className="font-['Roboto']"
                      onClick={refreshJobs}
                    >
                      Thử lại
                    </Button>
                  </div>
                </div>
              ) : filteredJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredJobs.map((job) => (
                    <Card
                      key={job.id}
                      className="cursor-pointer shadow-sm transition-all hover:ring-red-500 hover:shadow-md flex flex-col group"
                      onClick={() => handleJobClick(job.id)}
                    >
                      <CardContent className="p-3 flex items-start gap-3 sm:gap-4 h-full">
                        {/* Logo Section */}
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
                                  const fallback =
                                    e.target.parentElement.querySelector(
                                      ".logo-fallback",
                                    );
                                  if (fallback) fallback.style.display = "none";
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  const fallback =
                                    e.target.parentElement.querySelector(
                                      ".logo-fallback",
                                    );
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null;
                          })()}
                          <div
                            className={cn(
                              "logo-fallback flex h-full w-full items-center justify-center text-lg font-bold text-gray-400 bg-gray-50 rounded-md",
                              job.companyLogo ||
                                (job.company && job.company.logo)
                                ? "hidden"
                                : "flex",
                            )}
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

                        {/* Right Content Section */}
                        <div className="flex flex-col flex-1 min-w-0 h-full justify-between py-0.5">
                          <div className="mb-2">
                            <h3 className="font-['Open_Sans'] text-lg sm:text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug mb-1">
                              {job.title}
                            </h3>
                            <p className="text-sm text-gray-500 truncate font-['Roboto']">
                              {typeof job.company === "string"
                                ? job.company
                                : job.company?.name || "Company"}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-auto">
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
                              title={
                                savedJobIds.includes(job.id)
                                  ? "Bỏ lưu"
                                  : "Lưu việc làm"
                              }
                            >
                              <Heart
                                className={`w-4 h-4 ${savedJobIds.includes(job.id) ? "fill-red-500" : ""}`}
                              />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Search className="mx-auto mb-4 size-12 text-muted-foreground" />
                    <h3 className="mb-2 font-['Open_Sans'] text-lg font-medium text-foreground">
                      Không tìm thấy việc làm
                    </h3>
                    <p className="mb-4 font-['Roboto'] text-muted-foreground">
                      Hãy thử thay đổi từ khoá hoặc bộ lọc để tìm thêm việc làm.
                    </p>
                    <Button
                      type="button"
                      className="font-['Roboto']"
                      onClick={clearAllFilters}
                    >
                      Xoá tất cả bộ lọc
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {!loading && !error && totalJobs > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                loading={loading}
                totalItems={totalJobs}
                limit={pageLimit}
                itemLabel="việc làm"
              />
            )}
          </div>
        </div>

        {/* Top Companies Section */}
        <div className="mt-16 border-t border-gray-200 pt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-['Open_Sans'] text-gray-900 border-l-4 border-red-600 pl-3">
              Các công ty hàng đầu
            </h2>
            <Link
              to="/companies"
              className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center"
            >
              Xem tất cả <ChevronRight className="size-4 ml-1" />
            </Link>
          </div>

          {loadingCompanies ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : topCompanies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {topCompanies.map((company) => (
                <Link key={company._id} to={`/companies/${company._id}`}>
                  <Card className="hover:shadow-md transition-all cursor-pointer h-full border border-gray-200 hover:ring-red-500 hover:border-transparent flex flex-col p-4 bg-white">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-none w-20 h-20 min-w-[5rem] min-h-[5rem] rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center overflow-hidden">
                        {company.logo ? (
                          <img
                            src={
                              company.logo.startsWith("/uploads")
                                ? `${getApiUrl()}${company.logo}`
                                : company.logo
                            }
                            alt={company.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-2xl font-bold text-gray-300">
                            {company.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <h3 className="font-bold text-gray-900 uppercase line-clamp-2 leading-snug text-base">
                          {company.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {company.industry || "Nhiều lĩnh vực"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-2 flex items-center text-sm font-medium text-gray-800">
                      <Briefcase className="w-4 h-4 mr-2 text-gray-600" />
                      {company.jobsCount
                        ? `${company.jobsCount} việc làm`
                        : "Đang tuyển dụng"}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Chưa có công ty nào.</p>
          )}

          {!loadingCompanies && companiesPagination.total > 0 && (
            <div className="mt-8">
              <Pagination
                currentPage={companiesPage}
                totalPages={companiesPagination.totalPages}
                onPageChange={(page) => setCompaniesPage(page)}
                loading={loadingCompanies}
                totalItems={companiesPagination.total}
                limit={companiesPagination.limit}
                itemLabel="công ty"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default JobSearchPage;
