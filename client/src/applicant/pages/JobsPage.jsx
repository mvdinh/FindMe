import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicantLayout from '../layout/ApplicantLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../applicantLayoutClasses';
import { HR_FILTER_CONTROL } from '../applicantFormClasses';
import { useAuth } from '../../contexts/AuthContext';
import { CACHE_PREFIXES, CACHE_DURATIONS } from '../../utils/cacheUtils';
import { APP_DATA_CACHE_VERSION } from '../../utils/appCacheVersion';
import { smartCacheSet } from '../../utils/cacheManager';
import { getApiUrl } from '../../utils/api';
import { getRecruitmentCode } from '../../utils/recruitmentCode';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, MapPin, Briefcase, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const PAGE_SIZE = 20;
const JobsPage = () => {
  const navigate = useNavigate();
  const {
    apiRequest
  } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    workType: '',
    jobType: '',
    location: '',
    experience: '',
    salary: ''
  });
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
    hasPrevPage: false
  });
  const CACHE_DURATION = CACHE_DURATIONS.JOBS;
  const CACHE_KEY_PREFIX = CACHE_PREFIXES.JOBS;
  const getCacheKey = (searchTerm, filtersObj, page) => {
    const searchParams = {
      search: searchTerm,
      ...filtersObj,
      page: page,
      limit: PAGE_SIZE
    };
    const sortedParams = Object.keys(searchParams).sort().reduce((result, key) => {
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
      console.error('Error generating cache key:', error);
      const fallbackKey = JSON.stringify(sortedParams).replace(/[^a-zA-Z0-9]/g, '_');
      const cacheKey = CACHE_KEY_PREFIX + fallbackKey;
      return cacheKey;
    }
  };
  const loadFromCache = cacheKey => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.cacheVersion !== APP_DATA_CACHE_VERSION) {
          localStorage.removeItem(cacheKey);
          return null;
        }
        const now = new Date().getTime();
        const isValid = parsedCache.expiry ? now < parsedCache.expiry : now - parsedCache.timestamp < CACHE_DURATION;
        if (isValid) {
          return parsedCache.data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
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
        data: data
      };
      const dataSize = JSON.stringify(cacheData).length;
      if (dataSize > 2000000) {
        console.warn('Jobs data too large for cache, creating minimal version');
        const minimalData = {
          cacheVersion: APP_DATA_CACHE_VERSION,
          ...cacheData,
          data: {
            ...data,
            jobs: data.jobs.map(job => ({
              ...job,
              companyLogo: job.companyLogo ? 'LOGO_PLACEHOLDER' : null
            }))
          }
        };
        smartCacheSet(cacheKey, JSON.stringify(minimalData), {
          maxRetries: 1,
          clearOldCaches: true,
          clearAllOnFinalFailure: false
        });
        return;
      }
      const success = smartCacheSet(cacheKey, JSON.stringify(cacheData), {
        maxRetries: 2,
        clearOldCaches: true,
        clearAllOnFinalFailure: false
      });
      if (!success) {
        const minimalData = {
          cacheVersion: APP_DATA_CACHE_VERSION,
          timestamp: new Date().getTime(),
          expiry: new Date().getTime() + 5 * 60 * 1000,
          data: {
            jobs: Array.isArray(data.jobs) ? data.jobs : [],
            pagination: data.pagination
          }
        };
        smartCacheSet(cacheKey, JSON.stringify(minimalData), {
          maxRetries: 1,
          clearOldCaches: true,
          clearAllOnFinalFailure: false
        });
      }
    } catch (error) {
      console.error('Error in saveToCache:', error);
    }
  };

  const fetchJobs = useCallback(async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);
      const cacheKey = getCacheKey(debouncedSearchTerm, filters, currentPage);
      if (useCache) {
        const cachedData = loadFromCache(cacheKey);
        if (cachedData) {
          setJobs(cachedData.jobs);
          setPagination(cachedData.pagination);
          setLoading(false);
        }
      }
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString()
      });
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      if (filters.workType) params.append('workType', filters.workType);
      if (filters.jobType) params.append('jobType', filters.jobType);
      if (filters.experience) params.append('experienceLevel', filters.experience);
      if (filters.location) params.append('location', filters.location);
      const response = await apiRequest(`/api/jobs?${params}`);
      const data = await response.json();
      if (data.success) {
        const responseData = {
          jobs: data.data.jobs,
          pagination: data.data.pagination
        };
        setJobs(responseData.jobs);
        setPagination({
          ...responseData.pagination,
          limit: responseData.pagination?.limit ?? PAGE_SIZE
        });
        const cacheData = {
          jobs: data.data.jobs.map(job => ({
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
            country: job.country
          })),
          pagination: data.data.pagination
        };
        saveToCache(cacheKey, cacheData);
      } else {
        setError(data.message || 'Không thể tải danh sách việc làm');
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError('Không thể tải danh sách việc làm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, filters, currentPage, apiRequest]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, filters]);
  useEffect(() => {
    fetchJobs();
  }, [debouncedSearchTerm, filters, currentPage, fetchJobs]);
  const totalJobs = pagination.totalJobs;
  const totalPages = pagination.totalPages;
  const pageLimit = pagination.limit || PAGE_SIZE;
  const filteredJobs = jobs;
  const handleJobClick = jobId => {
    navigate(`/jobs/${jobId}`);
  };
  const handleApply = (e, jobId) => {
    e.stopPropagation();
    navigate(`/jobs/${jobId}/apply`);
  };
  const handleSearch = e => {
    const value = e.target.value;
    setSearchTerm(value);
  };
  const handleSingleSelectFilter = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };
  const clearAllFilters = () => {
    setFilters({
      workType: '',
      jobType: '',
      location: '',
      experience: '',
      salary: ''
    });
    setSearchTerm('');
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
  const handlePageChange = page => {
    setCurrentPage(page);
  };
  return <ApplicantLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Danh sách các công việc của công ty</h1>
            <p className={HR_SUBTITLE}>Tìm kiếm và lọc việc làm phù hợp với bạn</p>
          </div>
        </div>

        <Card className="mb-4 shadow-sm sm:mb-6">
          <CardContent className="p-4 sm:p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="text"
                placeholder="Tìm kiếm việc làm"
                value={searchTerm}
                onChange={handleSearch}
                className="min-h-11 touch-manipulation pl-10 font-['Roboto']"
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {Object.keys(filters).map(filterType => {
              let options = [];
              let label = '';
              let placeholder = '';
              switch (filterType) {
                case 'workType':
                  label = 'Hình thức làm việc';
                  options = ['remote', 'hybrid', 'onsite'];
                  break;
                case 'jobType':
                  label = 'Loại công việc';
                  options = ['Toàn thời gian', 'Bán thời gian', 'Hợp đồng', 'Thực tập', 'Tự do', 'Thời vụ'];
                  break;
                case 'experience':
                  label = 'Cấp bậc kinh nghiệm';
                  options = ['Mới vào nghề', 'Trung cấp', 'Cao cấp', 'Trưởng nhóm/Chuyên gia', 'Quản lý', 'Giám đốc bộ phận', 'Cấp điều hành'];
                  break;
                case 'location':
                  label = 'Địa điểm';
                  placeholder = 'Nhập tỉnh/thành phố';
                  break;
                case 'salary':
                  return null;
                default:
                  return null;
              }
              return <div key={filterType} className="relative">
                    <label className="mb-1 block font-['Roboto'] text-xs font-medium text-muted-foreground">
                      {label}
                    </label>
                    {options.length > 0 ? <select value={filters[filterType]} onChange={e => handleSingleSelectFilter(filterType, e.target.value)} className={HR_FILTER_CONTROL}>
                        <option value="">Tất cả {label.toLowerCase()}</option>
                        {options.map(option => <option key={option} value={option}>
                            {filterType === 'workType' ? option === 'remote' ? 'Từ xa' : option === 'hybrid' ? 'Kết hợp' : 'Tại văn phòng' : option}
                          </option>)}
                      </select> : <input type="text" placeholder={placeholder} value={filters[filterType]} onChange={e => handleSingleSelectFilter(filterType, e.target.value)} className={HR_FILTER_CONTROL} />}
                  </div>;
            })}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getActiveFilterCount() > 0 && (
                  <Button variant="link" className="h-auto p-0 font-['Roboto'] text-primary" onClick={clearAllFilters}>
                    Xoá tất cả bộ lọc ({getActiveFilterCount()})
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            {loading ? (
              <Skeleton className="h-6 w-32" />
            ) : error ? (
              <p className="font-['Open_Sans'] text-lg font-semibold text-destructive">Lỗi khi tải việc làm</p>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-['Open_Sans'] text-lg font-semibold text-foreground">
                  {totalJobs.toLocaleString()} việc làm
                  {totalJobs > PAGE_SIZE && (
                    <span className="text-base font-normal text-muted-foreground">
                      {' '}(trang {pagination.currentPage}/{totalPages})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          </CardContent>
        </Card>

        <div className="mb-8 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
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
                <AlertTitle className="font-['Open_Sans']">Không thể tải việc làm</AlertTitle>
                <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
              </Alert>
              <div className="flex justify-center">
                <Button type="button" className="font-['Roboto']" onClick={refreshJobs}>
                  Thử lại
                </Button>
              </div>
            </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
            <Card
              key={job.id}
              className="cursor-pointer shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
              onClick={() => handleJobClick(job.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted transition-colors">
                      {(() => {
                    const hasLogo = job.companyLogo || job.company && job.company.logo;
                    const rawLogo = job.companyLogo || job.company?.logo;
                    const logoSrc = rawLogo && rawLogo.startsWith('/uploads/') ? `${getApiUrl()}${rawLogo}` : rawLogo;
                    return hasLogo ? <img src={logoSrc} alt={`${(typeof job.company === 'string' ? job.company : job.company?.name) || 'Company'} logo`} className="w-full h-full object-contain" onError={e => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.logo-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }} /> : null;
                  })()}
                      <div
                        className={cn(
                          'logo-fallback flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground',
                          job.companyLogo || (job.company && job.company.logo) ? 'hidden' : 'flex'
                        )}
                      >
                        {((typeof job.company === 'string' ? job.company : job.company?.name) || 'Company').charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 font-['Open_Sans'] text-xl font-bold text-foreground transition-colors hover:text-primary">
                          {job.title}
                        </h3>
                        <p className="mb-3 font-['Roboto'] text-sm font-medium text-muted-foreground">
                          <span className="text-foreground">Mã tuyển dụng:</span> {getRecruitmentCode(job)}
                        </p>

                        <div className="mb-3 flex flex-wrap items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-4 shrink-0" aria-hidden />
                            <span className="font-['Roboto'] text-sm">{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="size-4 shrink-0" aria-hidden />
                            <span className="font-['Roboto'] text-sm">{job.workType}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-4 shrink-0" aria-hidden />
                            <span className="font-['Roboto'] text-sm">{job.jobType}</span>
                          </div>
                        </div>

                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="font-['Roboto'] font-normal">
                            {job.experience}
                          </Badge>
                          <Badge variant="secondary" className="font-['Roboto'] font-normal">
                            {job.salary}
                          </Badge>
                          <Badge variant="outline" className="font-['Roboto'] font-normal text-muted-foreground">
                            Đăng {job.postedDate}
                          </Badge>
                        </div>
                      </div>

                      <div className="ml-4 shrink-0">
                        <Button
                          type="button"
                          className="min-h-11 touch-manipulation font-['Roboto']"
                          onClick={e => handleApply(e, job.id)}
                        >
                          Ứng tuyển
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          ) : (
            <Card className="shadow-sm">
              <CardContent className="p-12 text-center">
                <Search className="mx-auto mb-4 size-12 text-muted-foreground" />
                <h3 className="mb-2 font-['Open_Sans'] text-lg font-medium text-foreground">Không tìm thấy việc làm</h3>
                <p className="mb-4 font-['Roboto'] text-muted-foreground">
                  Hãy thử thay đổi từ khoá hoặc bộ lọc để tìm thêm việc làm.
                </p>
                <Button type="button" className="font-['Roboto']" onClick={clearAllFilters}>
                  Xoá tất cả bộ lọc
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="font-['Roboto'] text-sm text-muted-foreground">
              Hiển thị{' '}
              <span className="font-medium text-foreground">{(currentPage - 1) * pageLimit + 1}</span> –{' '}
              <span className="font-medium text-foreground">{Math.min(currentPage * pageLimit, totalJobs)}</span> trong tổng{' '}
              <span className="font-medium text-foreground">{totalJobs}</span> việc làm
            </p>
            <nav className="inline-flex items-center justify-center rounded-md shadow-sm sm:justify-end" aria-label="Phân trang">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-r-none"
                disabled={!pagination.hasPrevPage}
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label="Trang trước"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[5.5rem] border border-l-0 border-input bg-background px-3 py-2 text-center font-['Roboto'] text-sm tabular-nums text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-l-none border-l-0"
                disabled={!pagination.hasNextPage}
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label="Trang sau"
              >
                <ChevronRight className="size-4" />
              </Button>
            </nav>
          </div>
        )}
      </div>
    </ApplicantLayout>;
};
export default JobsPage;




