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
import { formatDateVN } from '../applicantDateFormat';

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
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
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
          <div className="space-y-4">
            {savedJobs.length > 0 ? (
              savedJobs.map(job => (
                <Card
                  key={job.id}
                  className="cursor-pointer shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => handleJobClick(job.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-['Open_Sans'] text-lg font-semibold text-foreground">{job.title}</h3>
                          <div className="flex shrink-0 items-center gap-1 font-['Roboto'] text-sm text-muted-foreground">
                            <Heart className="size-4 fill-primary text-primary" aria-hidden />
                            Đã lưu {formatDate(job.savedAt)}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="font-['Roboto'] text-sm text-muted-foreground">Đăng {formatDate(job.postedDate)}</p>
                          <p className="font-['Roboto'] text-sm text-muted-foreground">
                            {job.location} • {job.workType}
                          </p>
                          <p className="font-['Roboto'] text-sm text-muted-foreground">
                            {job.jobType} • {job.experience} • {job.salary}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-4 sm:flex-col sm:items-stretch md:flex-row md:items-center">
                        <Button
                          type="button"
                          className="min-h-11 touch-manipulation font-['Roboto']"
                          onClick={e => handleApply(e, job.id)}
                        >
                          Ứng tuyển
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 touch-manipulation gap-1 font-['Roboto']"
                          onClick={e => handleRemoveFromSaved(e, job.id)}
                          disabled={removingJobId === job.id}
                          title="Bỏ lưu"
                        >
                          {removingJobId === job.id ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              Đang xóa...
                            </>
                          ) : (
                            <>
                              <Trash2 className="size-4" />
                              Bỏ lưu
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="shadow-sm">
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
