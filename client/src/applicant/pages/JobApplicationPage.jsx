import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ApplicantLayout from '../layout/ApplicantLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../applicantLayoutClasses';
import { HR_INPUT, HR_TEXTAREA, HR_INPUT_ROUNDED_L } from '../applicantFormClasses';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getRecruitmentCode } from '../../utils/recruitmentCode';
import { formatDateVN } from '../applicantDateFormat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ChevronRight, Loader2, Upload, X } from 'lucide-react';

function getApplicantFacingStatusLabel(application) {
  if (!application) return '—';
  if (['queued', 'processing'].includes(application?.aiProcessing?.status)) {
    return 'AI đang phân loại hồ sơ';
  }
  const status = application.status;
  const texts = {
    submitted: 'Đang chờ nhà tuyển dụng phản hồi',
    under_review: 'Đơn đang được xem xét',
    shortlisted: 'Đơn đang được xem xét',
    interview_scheduled: 'Được mời phỏng vấn',
    interview_confirmed: 'Đã xác nhận lịch phỏng vấn',
    interview_passed: 'Đạt phỏng vấn',
    offer_extended: 'Đã nhận đề nghị công việc',
    offer_accepted: 'Đã chấp nhận đề nghị',
    offer_declined: 'Đã từ chối đề nghị',
    rejected: 'Đơn bị từ chối',
    withdrawn: 'Bạn đã rút đơn'
  };
  return texts[status] || status || '—';
}

const JobApplicationPage = () => {
  const {
    jobId
  } = useParams();
  const navigate = useNavigate();
  const {
    apiRequest,
    user,
    refreshUser
  } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useProfileResume, setUseProfileResume] = useState(false);
  const [customResumeFile, setCustomResumeFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [job, setJob] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [existingApplication, setExistingApplication] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const hasResume = () => !!getResumeDetails();
  const getResumeDetails = () => {
    if (user?.currentResumeId) {
      return {
        fileName: user.currentResumeId.originalName || user.currentResumeId.fileName || "Resume",
        source: 'profile',
        uploadDate: user.currentResumeId.uploadDate,
        fileSize: user.currentResumeId.fileSize
      };
    } else if (user?.profile?.currentResumeId) {
      return {
        fileName: user.profile.currentResumeId.originalName || user.profile.currentResumeId.fileName || "Resume",
        source: 'profile',
        uploadDate: user.profile.currentResumeId.uploadDate,
        fileSize: user.profile.currentResumeId.fileSize
      };
    } else if (user?.resume?.fileName) {
      return {
        fileName: user.resume.fileName || "Resume",
        source: 'legacy',
        uploadDate: user.resume.uploadDate,
        fileSize: user.resume.fileSize
      };
    } else if (user?.profile?.resume?.fileName) {
      return {
        fileName: user.profile.resume.fileName || "Resume",
        source: 'legacy',
        uploadDate: user.profile.resume.uploadDate,
        fileSize: user.profile.resume.fileSize
      };
    }
    return null;
  };
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    coverLetter: ''
  });
  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (refreshUser && typeof refreshUser === 'function') {
          await refreshUser();
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    };
    if (!user?.profile) {
      loadUserData();
    }
  }, []);
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || user.profile?.currentLocation || ''
      }));
      setSkills(user.skills || user.profile?.primarySkills || []);
      const resume = getResumeDetails();
      setUseProfileResume(!!resume);
      if (resume) {
        setCustomResumeFile(null);
        setUploadProgress(0);
        setIsProcessing(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (useProfileResume) {
      setCustomResumeFile(null);
      setUploadProgress(0);
      setIsProcessing(false);
    }
  }, [useProfileResume]);
  useEffect(() => {
    const fetchJobAndCheckApplication = async () => {
      try {
        setIsLoading(true);
        const jobResponse = await apiRequest(`/api/jobs/${jobId}`);
        if (jobResponse.ok) {
          const jobData = await jobResponse.json();
          const jobDetails = jobData.data?.job || jobData.data || jobData;
          setJob(jobDetails);
        } else {
          throw new Error(`Failed to fetch job: ${jobResponse.status}`);
        }
        const checkResponse = await apiRequest(`/api/applicant/applications/check/${jobId}`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          setHasApplied(checkData.hasApplied);
          setExistingApplication(checkData.application);
        } else if (checkResponse.status === 304) {
          setHasApplied(false);
          setExistingApplication(null);
        } else {
          console.warn('Unexpected response status:', checkResponse.status);
          setHasApplied(false);
          setExistingApplication(null);
        }
      } catch (error) {
        console.error('Error fetching job or checking application:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) {
      fetchJobAndCheckApplication();
    }
  }, [jobId, apiRequest]);
  const handleInputChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSkillInputChange = e => {
    setSkillInput(e.target.value);
  };
  const handleSkillInputKeyPress = e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
  };
  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !skills.includes(skill)) {
      setSkills(prev => [...prev, skill]);
      setSkillInput('');
    }
  };
  const removeSkill = skillToRemove => {
    setSkills(prev => prev.filter(skill => skill !== skillToRemove));
  };
  const handleCustomResumeUpload = e => {
    if (isSubmitting) return;
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        console.error('Please upload a PDF or Word document.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        console.error('File size must be less than 5MB.');
        return;
      }
      setCustomResumeFile(file);
      setIsProcessing(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
          }, 500);
        }
      }, 100);
    }
  };
  const handleDragOver = e => {
    e.preventDefault();
  };
  const handleDrop = e => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!useProfileResume) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        const fakeEvent = {
          target: {
            files: [file]
          }
        };
        handleCustomResumeUpload(fakeEvent);
      }
    }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const resume = getResumeDetails();
    if (useProfileResume) {
      if (!resume) {
        console.error('Validation Error: No resume found in profile.');
        return;
      }
    } else if (!customResumeFile) {
      console.error('Validation Error: Please upload your resume to continue.');
      return;
    }
    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('jobId', jobId);
      submitData.append('firstName', formData.firstName);
      submitData.append('lastName', formData.lastName);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('location', formData.location);
      submitData.append('skills', skills.join(','));
      submitData.append('coverLetter', formData.coverLetter);
      submitData.append('useProfileResume', useProfileResume ? 'true' : 'false');
      if (!useProfileResume && customResumeFile) {
        submitData.append('customResume', customResumeFile);
      }
      const response = await apiRequest('/api/applicant/applications', {
        method: 'POST',
        body: submitData,
        headers: {}
      });
      if (response.ok) {
        const result = await response.json();
        if (result && result.application && result.application._id) {
          navigate('/');
          window.setTimeout(() => {
            toast.info(
              'Đơn đã gửi. Hệ thống đang phân loại CV trong nền — bạn có thể xem tiến độ tại mục Đơn ứng tuyển.',
              { duration: 6500 }
            );
          }, 350);
          return;
        }
        console.error('Application not saved. Please try again.');
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Error submitting application.');
      }
    } catch (error) {
      console.error('Application submission error:', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const JobApplicationSkeleton = () => (
    <div className={`${HR_PAGE} max-w-5xl`}>
      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-8">
          <Skeleton className="h-6 w-1/3 max-w-xs" />
          <Skeleton className="h-4 w-2/3 max-w-lg" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
  if (isLoading) {
    return <ApplicantLayout>
        <JobApplicationSkeleton />
      </ApplicantLayout>;
  }
  if (!job) {
    return (
      <ApplicantLayout>
        <div className={`${HR_PAGE} max-w-5xl`}>
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <h2 className="mb-2 font-['Open_Sans'] text-xl font-semibold text-foreground">Không tìm thấy việc làm</h2>
              <p className="mb-4 font-['Roboto'] text-muted-foreground">
                Việc làm bạn đang ứng tuyển không tồn tại hoặc đã bị gỡ.
              </p>
              <Button variant="link" className="font-['Roboto']" asChild>
                <Link to="/jobs">Quay lại danh sách việc làm</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </ApplicantLayout>
    );
  }
  if (hasApplied) {
    const appliedAtRaw = existingApplication?.appliedAt || existingApplication?.createdAt || null;
    const appliedAtLabel = (() => {
      if (!appliedAtRaw) return '—';
      const d = new Date(appliedAtRaw);
      if (Number.isNaN(d.getTime())) return '—';
      const datePart = formatDateVN(d) || '—';
      const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return `${datePart} ${timePart}`;
    })();
    return (
      <ApplicantLayout>
        <div className={`${HR_PAGE} max-w-5xl`}>
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                <CheckCircle2 className="size-8 text-primary" />
              </div>
              <h2 className="mb-2 font-['Open_Sans'] text-xl font-semibold text-foreground">Đã ứng tuyển</h2>
              <p className="mb-4 font-['Roboto'] text-muted-foreground">
                Bạn đã ứng tuyển vị trí này vào {appliedAtLabel}.
              </p>
              <p className="mb-6 font-['Roboto'] text-sm text-muted-foreground">
                Trạng thái:{' '}
                <span className="font-medium text-foreground">{getApplicantFacingStatusLabel(existingApplication)}</span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button className="font-['Roboto']" asChild>
                  <Link to="/applicant/applications">Xem đơn ứng tuyển</Link>
                </Button>
                <Button variant="outline" className="font-['Roboto']" asChild>
                  <Link to="/jobs">Quay lại danh sách việc làm</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ApplicantLayout>
    );
  }
  const submitDisabled =
    isSubmitting || (useProfileResume && !hasResume()) || (!useProfileResume && !customResumeFile);

  return (
    <ApplicantLayout>
      <div className={`${HR_PAGE} max-w-5xl`}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Ứng tuyển</h1>
            <p className={HR_SUBTITLE}>Điền thông tin và gửi đơn cho vị trí bên dưới.</p>
          </div>
        </div>

        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  to="/jobs"
                  className="font-['Roboto'] text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Việc làm
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="size-4 text-muted-foreground" />
              </li>
              <li>
                <Link
                  to={`/jobs/${jobId}`}
                  className="font-['Roboto'] text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {job?.title || 'Chi tiết việc làm'}
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="size-4 text-muted-foreground" />
              </li>
              <li>
                <span className="font-['Roboto'] text-sm font-medium text-foreground">Ứng tuyển</span>
              </li>
            </ol>
          </nav>
        </div>

        <Card className="mb-6 shadow-sm">
          <CardContent className="flex items-start gap-4 p-6">
            {(job?.company?.logo || job?.companyDetails?.logo) && (
              <img
                src={job?.company?.logo || job?.companyDetails?.logo}
                alt={
                  (typeof job?.company === 'string' ? job?.company : job?.company?.name) ||
                  job?.companyName ||
                  'Company Logo'
                }
                className="size-12 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-['Open_Sans'] text-xl font-bold text-foreground">
                {job?.title || 'Chưa có tiêu đề việc làm'}
              </h2>
              <p className="mb-1 font-['Roboto'] text-muted-foreground">
                <span className="font-medium text-foreground">Mã tuyển dụng:</span> {getRecruitmentCode(job)}
              </p>
              <div className="grid grid-cols-1 gap-2 font-['Roboto'] text-sm text-muted-foreground md:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">Nơi làm việc:</span>{' '}
                  {job?.location || 'Chưa có địa điểm'}
                </p>
                <p>
                  <span className="font-medium text-foreground">Loại công việc:</span>{' '}
                  {job?.jobType || job?.type || 'Chưa có loại công việc'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-sm">
          <CardHeader className="border-b border-border bg-muted/40 p-6">
            <h2 className="font-['Open_Sans'] text-lg font-semibold text-foreground">CV / Hồ sơ</h2>

            <div
              className={cn(
                'mt-4 rounded-xl border border-border bg-card p-4 transition-opacity',
                isSubmitting && 'pointer-events-none select-none opacity-60'
              )}
              aria-busy={isSubmitting}
            >
              <p className="font-['Roboto'] text-sm font-medium text-foreground">Chọn CV để nộp (bắt buộc)</p>
              <div className="mt-3 space-y-3">
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    useProfileResume ? 'border-primary bg-primary/5' : 'border-border bg-transparent'
                  )}
                >
                  <input
                    type="radio"
                    name="resumeSource"
                    checked={useProfileResume}
                    onChange={() => setUseProfileResume(true)}
                    disabled={isSubmitting || !hasResume()}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-['Roboto'] text-sm font-medium text-foreground">Dùng CV từ hồ sơ</p>
                      {!hasResume() && (
                        <span className="font-['Roboto'] text-xs text-destructive">Chưa có CV trong hồ sơ</span>
                      )}
                    </div>
                    {hasResume() &&
                      (() => {
                        const r = getResumeDetails();
                        return (
                          <p className="font-['Roboto'] text-xs text-muted-foreground">
                            {r?.fileName || 'CV'}
                            {r?.uploadDate ? ` • Tải lên: ${r.uploadDate}` : ''}
                            {r?.fileSize ? ` • ${r.fileSize}` : ''}
                          </p>
                        );
                      })()}
                    {!hasResume() && (
                      <p className="font-['Roboto'] text-xs text-muted-foreground">
                        Bạn có thể tải CV ở trang Hồ sơ, hoặc chọn &quot;Tải CV mới lên&quot; bên dưới.
                      </p>
                    )}
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    !useProfileResume ? 'border-primary bg-primary/5' : 'border-border bg-transparent'
                  )}
                >
                  <input
                    type="radio"
                    name="resumeSource"
                    checked={!useProfileResume}
                    onChange={() => setUseProfileResume(false)}
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-['Roboto'] text-sm font-medium text-foreground">Tải CV mới lên</p>
                    <p className="font-['Roboto'] text-xs text-muted-foreground">PDF, DOC, DOCX (tối đa 5MB)</p>
                  </div>
                </label>
              </div>

              <div
                className={cn(
                  'mt-3 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors',
                  !isSubmitting && 'hover:border-muted-foreground/40'
                )}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {useProfileResume ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2
                        className={cn('size-5', hasResume() ? 'text-primary' : 'text-muted-foreground')}
                      />
                      <span className="font-['Roboto'] text-sm font-medium text-foreground">
                        {hasResume() ? 'Sẽ dùng CV từ hồ sơ' : 'Chưa có CV trong hồ sơ'}
                      </span>
                    </div>
                    {!hasResume() && (
                      <p className="font-['Roboto'] text-xs text-muted-foreground">
                        Vui lòng tải CV lên trong trang Hồ sơ hoặc chuyển sang &quot;Tải CV mới lên&quot;.
                      </p>
                    )}
                  </div>
                ) : customResumeFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="size-5 text-primary" />
                      <span className="font-['Roboto'] text-sm font-medium text-foreground">
                        {customResumeFile.name}
                      </span>
                    </div>
                    {isProcessing && (
                      <div className="space-y-1">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-1 rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Đang xử lý...</p>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="link"
                      className="mt-2 h-auto p-0 font-['Roboto'] text-destructive"
                      disabled={isSubmitting}
                      onClick={() => {
                        setCustomResumeFile(null);
                        setUploadProgress(0);
                        setIsProcessing(false);
                      }}
                    >
                      Xoá tệp
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto size-8 text-muted-foreground" />
                    <div>
                      <label
                        className={cn(
                          "font-medium font-['Roboto'] text-primary",
                          isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:underline'
                        )}
                      >
                        Nhấn để tải lên hoặc kéo thả tệp vào đây
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleCustomResumeUpload}
                          disabled={isSubmitting}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">
                        PDF, DOC, DOCX (tối đa 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <h2 className="mb-6 font-['Open_Sans'] text-lg font-semibold text-foreground">Thông tin ứng tuyển</h2>

            <form onSubmit={handleSubmit} className="space-y-6" aria-busy={isSubmitting}>
              <fieldset disabled={isSubmitting} className="min-w-0 border-0 p-0 m-0 space-y-6 disabled:opacity-70">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block font-['Roboto'] text-sm font-medium text-muted-foreground">Tên *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className={HR_INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-['Roboto'] text-sm font-medium text-muted-foreground">Họ *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className={HR_INPUT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block font-['Roboto'] text-sm font-medium text-muted-foreground">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={HR_INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block font-['Roboto'] text-sm font-medium text-muted-foreground">
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="VD: 0901234567"
                    className={HR_INPUT}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-['Roboto'] text-sm font-medium text-muted-foreground">Kỹ năng</label>
                <div className="space-y-2">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center gap-0.5">
                        <Badge variant="secondary" className="font-['Roboto'] font-normal">
                          {skill}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => removeSkill(skill)}
                          aria-label={`Xóa ${skill}`}
                        >
                          <X className="size-3" />
                        </Button>
                      </span>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={handleSkillInputChange}
                      onKeyPress={handleSkillInputKeyPress}
                      placeholder="Nhập kỹ năng và nhấn Enter"
                      className={HR_INPUT_ROUNDED_L}
                    />
                    <Button type="button" className="rounded-l-none px-4 font-['Roboto']" onClick={addSkill}>
                      Thêm
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-['Roboto'] text-sm font-medium text-muted-foreground">
                  Thư giới thiệu <span className="text-muted-foreground/80">(không bắt buộc)</span>
                </label>
                <textarea
                  name="coverLetter"
                  value={formData.coverLetter}
                  onChange={handleInputChange}
                  rows={4}
                  maxLength={2000}
                  className={`${HR_TEXTAREA} resize-none`}
                  placeholder="Hãy chia sẻ vì sao bạn quan tâm vị trí này và kinh nghiệm của bạn phù hợp như thế nào..."
                />
                <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">
                  {formData.coverLetter.length}/2000 ký tự
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitDisabled}
                className="min-h-11 w-full touch-manipulation font-['Roboto']"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang nộp đơn...
                  </>
                ) : (
                  'Nộp đơn ứng tuyển'
                )}
              </Button>
              {isSubmitting && (
                <p className="mt-2 text-center font-['Roboto'] text-xs text-muted-foreground">
                  Đang gửi hồ sơ — vui lòng không thay đổi CV hoặc đóng trang cho đến khi xong.
                </p>
              )}
              </fieldset>
            </form>
          </CardContent>
        </Card>
      </div>
    </ApplicantLayout>
  );
};
export default JobApplicationPage;




