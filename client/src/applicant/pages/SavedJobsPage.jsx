import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicantLayout from '../layout/ApplicantLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../applicantLayoutClasses';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Heart, Trash2, Loader2 } from 'lucide-react';
import { formatDateVN } from "@/utils/dateFormat";
import { getApiUrl } from "../../utils/api";
import { cn } from "@/lib/utils";

const SavedJobsPage = () => {
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingJobId, setRemovingJobId] = useState(null);

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const loadSavedJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest('/api/applicant/saved-jobs', {
        method: 'GET'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedJobs(data.data || []);
        } else {
          setError(data.message || 'Không thể tải việc làm đã lưu');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Không thể tải việc làm đã lưu');
      }
    } catch (err) {
      console.error('Error loading saved jobs:', err);
      setError('Không thể tải việc làm đã lưu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleJobClick = jobId => {
    navigate(`/jobs/${jobId}`);
  };

  const handleApply = (e, jobId) => {
    e.stopPropagation();
    navigate(`/jobs/${jobId}/apply`);
  };

  const handleRemoveFromSaved = async (e, jobId) => {
    e.stopPropagation();
    try {
      setRemovingJobId(jobId);
      const response = await apiRequest(`/api/applicant/saved-jobs/${jobId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedJobs(prev => prev.filter(job => job.id !== jobId));
        } else {
          setError(data.message || 'Không thể bỏ lưu việc làm');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Không thể bỏ lưu việc làm');
      }
    } catch (err) {
      console.error('Error removing saved job:', err);
      setError('Không thể bỏ lưu việc làm. Vui lòng thử lại.');
    } finally {
      setRemovingJobId(null);
    }
  };

  const formatDate = dateString => {
    try {
      if (!dateString) return 'Gần đây';
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return 'Gần đây';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const absMs = Math.abs(diffMs);
      const mins = Math.floor(absMs / 60000);
      const hours = Math.floor(absMs / (60 * 60000));
      const days = Math.floor(absMs / (24 * 60 * 60000));

      if (mins < 1) return 'Vừa xong';
      if (mins < 60) return `${mins} phút trước`;
      if (hours < 24) return `${hours} giờ trước`;
      if (days === 1) return '1 ngày trước';
      if (days < 7) return `${days} ngày trước`;
      return formatDateVN(date) || 'Gần đây';
    } catch {
      return 'Gần đây';
    }
  };

  return (
    <ApplicantLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Việc làm đã lưu</h1>
            <p className={HR_SUBTITLE}>Các việc làm bạn đã đánh dấu để xem sau</p>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="space-y-3 p-6">
                  <Skeleton className="h-5 w-3/4 max-w-md" />
                  <Skeleton className="h-4 w-1/2 max-w-sm" />
                  <Skeleton className="h-4 w-2/3 max-w-lg" />
                  <Skeleton className="h-4 w-1/3 max-w-xs" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive" className="max-w-xl">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-['Open_Sans']">Không tải được việc làm đã lưu</AlertTitle>
            <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
          </Alert>
        )}
        {error && !loading && (
          <div className="mt-4">
            <Button type="button" className="min-h-11 touch-manipulation font-['Roboto']" onClick={loadSavedJobs}>
              Thử lại
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {savedJobs.length > 0 ? (
              savedJobs.map(job => (
                <Card
                  key={job.id}
                  className="cursor-pointer shadow-sm transition-all hover:ring-red-500 hover:shadow-md flex flex-col group h-full"
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
                          {typeof job.company === "string" ? job.company : job.company?.name || "Company"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-md font-medium whitespace-nowrap font-['Roboto']">
                            {job.salary}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs sm:text-sm rounded-md font-medium whitespace-nowrap truncate font-['Roboto']">
                            {job.location}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm font-['Roboto'] px-2"
                            onClick={e => handleApply(e, job.id)}
                          >
                            Ứng tuyển
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm font-['Roboto'] gap-1 px-2 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={e => handleRemoveFromSaved(e, job.id)}
                            disabled={removingJobId === job.id}
                            title="Bỏ lưu"
                          >
                            {removingJobId === job.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            <span className="truncate">Bỏ lưu</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-sm lg:col-span-2">
                <CardContent className="p-12 text-center">
                  <Heart className="mx-auto mb-4 size-12 text-muted-foreground/60" />
                  <h3 className="mb-2 font-['Open_Sans'] text-lg font-medium text-foreground">Chưa có việc làm đã lưu</h3>
                  <p className="mb-4 font-['Roboto'] text-muted-foreground">Duyệt việc làm và nhấn biểu tượng trái tim để lưu xem sau.</p>
                  <Button type="button" className="min-h-11 touch-manipulation font-['Roboto']" onClick={() => navigate('/jobs')}>
                    Duyệt việc làm
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </ApplicantLayout>
  );
};

export default SavedJobsPage;
