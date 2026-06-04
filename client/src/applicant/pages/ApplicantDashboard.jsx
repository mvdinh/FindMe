import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ApplicantLayout from '../layout/ApplicantLayout';
import { HR_PAGE, HR_PAGE_HEADER, HR_H1, HR_SUBTITLE } from '../applicantLayoutClasses';
import { hrStatusBadgeClass } from '../applicantTheme';
import { useAuth } from '../../contexts/AuthContext';
import { getRecruitmentCode } from '../../utils/recruitmentCode';
import { getInterviewPassFailLabel, getInterviewPassFailBadgeKey } from '../../utils/applicationStatusDisplay';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Heart,
  Info,
  Search,
  User,
  Zap
} from 'lucide-react';
const ApplicantDashboard = () => {
  const {
    user,
    apiRequest
  } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    stats: {
      jobsApplied: 0,
      savedJobs: 0
    },
    recentApplications: [],
    recommendedJobs: [],
    recentActivity: [],
    profileCompletion: {
      percentage: 0,
      missingItems: []
    },
    topSkills: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchDashboardData();
  }, []);
  useEffect(() => {
    if (user && user.firstName && user.email) {
      const profileCompletion = calculateProfileCompletion(user);
      setDashboardData(prevData => ({
        ...prevData,
        profileCompletion
      }));
    }
  }, [user]);
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [statsResponse, applicationsResponse, jobsResponse, savedJobsResponse] = await Promise.all([apiRequest('/api/applications/stats/dashboard'), apiRequest('/api/applicant/applications?limit=5'), apiRequest('/api/jobs?limit=6'), apiRequest('/api/applicant/saved-jobs')]);
      let statsData = {
        data: {
          stats: {}
        }
      };
      let applicationsData = {
        applications: []
      };
      let jobsData = {
        jobs: [],
        data: []
      };
      let savedJobsData = {
        data: []
      };
      try {
        if (statsResponse && statsResponse.ok) {
          statsData = await statsResponse.json();
        }
      } catch (e) {
        console.warn('Failed to parse stats data:', e);
      }
      try {
        if (applicationsResponse && applicationsResponse.ok) {
          applicationsData = await applicationsResponse.json();
        }
      } catch (e) {
        console.warn('Failed to parse applications data:', e);
      }
      try {
        if (jobsResponse && jobsResponse.ok) {
          jobsData = await jobsResponse.json();
        }
      } catch (e) {
        console.warn('Failed to parse jobs data:', e);
      }
      try {
        if (savedJobsResponse && savedJobsResponse.ok) {
          savedJobsData = await savedJobsResponse.json();
        }
      } catch (e) {
        console.warn('Failed to parse saved jobs data:', e);
      }
      let jobsArray = [];
      if (jobsData.data && jobsData.data.jobs && Array.isArray(jobsData.data.jobs)) {
        jobsArray = jobsData.data.jobs;
      } else if (jobsData.jobs && Array.isArray(jobsData.jobs)) {
        jobsArray = jobsData.jobs;
      } else if (jobsData.data && Array.isArray(jobsData.data)) {
        jobsArray = jobsData.data;
      } else if (Array.isArray(jobsData)) {
        jobsArray = jobsData;
      }
      const recommendedJobs = calculateJobRecommendations(jobsArray);
      const recentActivity = generateActivityFeed(applicationsData.applications || []);
      const totalApplications = statsData.data?.stats?.totalApplications || 0;
      const savedJobsCount = savedJobsData.data?.length || 0;
      const profileCompletion = calculateProfileCompletion(user);
      const finalApplications = applicationsData.applications || [];
      setDashboardData({
        stats: {
          jobsApplied: totalApplications,
          savedJobs: savedJobsCount
        },
        profileCompletion,
        topSkills: generateTopSkills(user?.skills || []),
        recentApplications: finalApplications,
        recommendedJobs,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };
  const calculateJobRecommendations = jobs => {
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) return [];
    const userSkills = user?.skills || [];
    const userExperience = user?.experience || 'fresher';
    return jobs.slice(0, 6).map(job => {
      let matchScore = 50;
      if (job.requiredSkills && userSkills.length > 0) {
        const jobSkills = job.requiredSkills.map(skill => skill.toLowerCase());
        const matchingSkills = userSkills.filter(skill => jobSkills.some(jobSkill => jobSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(jobSkill)));
        matchScore += matchingSkills.length / Math.max(jobSkills.length, userSkills.length) * 30;
      }
      if (job.experienceLevel) {
        const experienceMatch = {
          'fresher': {
            'fresher': 20,
            'mid-level': 5,
            'senior': 0,
            'expert': 0
          },
          'mid-level': {
            'fresher': 10,
            'mid-level': 20,
            'senior': 10,
            'expert': 0
          },
          'senior': {
            'fresher': 0,
            'mid-level': 10,
            'senior': 20,
            'expert': 10
          },
          'expert': {
            'fresher': 0,
            'mid-level': 5,
            'senior': 15,
            'expert': 20
          }
        };
        matchScore += experienceMatch[userExperience]?.[job.experienceLevel] || 0;
      }
      if (job.workType === 'remote') {
        matchScore += 10;
      }
      matchScore = Math.min(98, Math.max(70, Math.round(matchScore)));
      const recommendedJob = {
        id: job._id || job.id,
        title: job.title,
        location: job.location,
        type: job.jobType || 'Toàn thời gian',
        posted: formatTimeAgo(job.createdAt),
        match: matchScore,
        salary: formatSalary(job.salaryRange)
      };
      return recommendedJob;
    });
  };
  const generateActivityFeed = applications => {
    if (!Array.isArray(applications)) return [];
    const activities = [];
    applications.forEach(app => {
      if (!app || !app._id) return;
      const jobTitle = app.job?.title || 'Vị trí';
      activities.push({
        id: `submit_${app._id}`,
        type: 'application_submitted',
        message: `Đã nộp đơn ứng tuyển cho ${jobTitle}`,
        timestamp: formatTimeAgo(app.createdAt)
      });
      if (app.status === 'under_review') {
        activities.push({
          id: `review_${app._id}`,
          type: 'application_viewed',
          message: `Đơn ứng tuyển của bạn cho ${jobTitle} đang được xem xét`,
          timestamp: formatTimeAgo(app.updatedAt)
        });
      } else if (app.status === 'interview_scheduled') {
        activities.push({
          id: `interview_${app._id}`,
          type: 'interview_scheduled',
          message: `Bạn được mời phỏng vấn cho ${jobTitle}`,
          timestamp: formatTimeAgo(app.updatedAt)
        });
      }
    });
    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  };
  const formatSalary = salaryRange => {
    if (!salaryRange) return 'Chưa có thông tin lương';
    const {
      min,
      max
    } = salaryRange;
    if (min && max) {
      return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    }
    return 'Mức lương cạnh tranh';
  };
  const formatTimeAgo = dateString => {
    if (!dateString) return 'Gần đây';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return '1 ngày trước';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return `${Math.floor(diffDays / 30)} tháng trước`;
  };
  const calculateProfileCompletion = user => {
    if (!user) {
      return {
        percentage: 0,
        missingItems: []
      };
    }
    const requiredFields = [{
      field: 'firstName',
      label: 'Tên',
      weight: 10
    }, {
      field: 'lastName',
      label: 'Họ',
      weight: 10
    }, {
      field: 'email',
      label: 'Email',
      weight: 10
    }, {
      field: 'phone',
      label: 'Số điện thoại',
      weight: 10
    }, {
      field: 'skills',
      label: 'Kỹ năng',
      weight: 20
    }, {
      field: 'profile.workExperienceEntries',
      label: 'Kinh nghiệm',
      weight: 15
    }, {
      field: 'currentResumeId',
      label: 'CV',
      weight: 25
    }];
    let completedWeight = 0;
    const missingItems = [];
    requiredFields.forEach(({
      field,
      label,
      weight
    }) => {
      let fieldValue;
      let isFieldComplete = false;
      if (field === 'skills') {
        fieldValue = user.skills || user.profile?.primarySkills;
        isFieldComplete = fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0;
      } else if (field === 'currentResumeId') {
        fieldValue = user.currentResumeId || user.resumeAvailable || user.resume || user.profile?.currentResumeId;
        const hasResumeFile = user.profile?.resume?.fileName || user.resume?.fileName;
        isFieldComplete = !!fieldValue || !!hasResumeFile;
      } else if (field === 'profile.workExperienceEntries') {
        fieldValue = user.profile?.workExperienceEntries || user.workExperience;
        isFieldComplete = fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0;
      } else {
        fieldValue = field.includes('.') ? field.split('.').reduce((obj, key) => obj?.[key], user) : user[field];
        isFieldComplete = fieldValue && (Array.isArray(fieldValue) ? fieldValue.length > 0 : true);
      }
      if (isFieldComplete) {
        completedWeight += weight;
      } else {
        missingItems.push(label);
      }
    });
    const result = {
      percentage: completedWeight,
      missingItems
    };
    return result;
  };
  const generateTopSkills = userSkills => {
    if (!userSkills || userSkills.length === 0) return [];
    const skillDemand = {
      'JavaScript': 85,
      'React': 78,
      'Node.js': 72,
      'Python': 80,
      'Java': 75,
      'CSS': 65,
      'HTML': 70,
      'TypeScript': 68,
      'MongoDB': 60,
      'SQL': 77
    };
    return userSkills.slice(0, 5).map(skill => ({
      name: skill,
      demand: skillDemand[skill] || Math.floor(Math.random() * 40) + 50
    })).sort((a, b) => b.demand - a.demand);
  };
  const getStatusText = status => {
    const texts = {
      submitted: 'Đã nộp',
      under_review: 'Đang xem xét',
      in_review: 'Đang xem xét',
      shortlisted: 'Đang xem xét',
      interview_scheduled: 'Được mời phỏng vấn',
      interview_confirmed: 'Đã xác nhận lịch PV',
      interview_passed: 'Đạt phỏng vấn',
      offer_extended: 'Đã nhận đề nghị',
      offer_accepted: 'Đã chấp nhận đề nghị',
      offer_declined: 'Đã từ chối đề nghị',
      rejected: 'Bị từ chối',
      withdrawn: 'Đã rút đơn'
    };
    return texts[status] || status;
  };
  const getActivityIcon = type => {
    const cls = 'size-4 text-muted-foreground';
    switch (type) {
      case 'application_viewed':
        return <Eye className={cls} />;
      case 'interview_scheduled':
        return <Calendar className={cls} />;
      case 'application_submitted':
        return <FileText className={cls} />;
      default:
        return <Info className={cls} />;
    }
  };
  if (error) {
    return (
      <ApplicantLayout>
        <div className={HR_PAGE}>
          <Alert variant="destructive" className="max-w-lg mx-auto">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-['Open_Sans']">Không tải được bảng điều khiển</AlertTitle>
            <AlertDescription className="font-['Roboto']">
              Đang gặp sự cố tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button type="button" className="min-h-11 touch-manipulation font-['Roboto']" onClick={fetchDashboardData}>
              Thử lại
            </Button>
          </div>
        </div>
      </ApplicantLayout>
    );
  }
  return <ApplicantLayout>
      <div className={HR_PAGE}>
        <div className={HR_PAGE_HEADER}>
          <div className="min-w-0 flex-1">
            <h1 className={HR_H1}>Chào mừng trở lại, {user?.firstName || 'bạn'}!</h1>
            <p className={HR_SUBTITLE}>Đây là tình hình tìm việc của bạn hôm nay.</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-5 sm:grid-cols-2">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="flex items-center gap-4 pt-6">
                  <Skeleton className="size-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Link to="/applicant/applications" className="block">
                <Card className="h-full shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
                      <ClipboardList className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">Đơn ứng tuyển</p>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{dashboardData.stats.jobsApplied}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/saved-jobs" className="block">
                <Card className="h-full shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4 pt-6">
                    <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
                      <Heart className="size-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-['Roboto'] text-sm font-medium text-muted-foreground">Việc làm đã lưu</p>
                      <p className="font-['Open_Sans'] text-2xl font-bold text-foreground">{dashboardData.stats.savedJobs || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch">
          <Card className="h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="font-['Open_Sans'] text-base sm:text-lg">Hoàn thiện hồ sơ</CardTitle>
              <User className="size-5 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-6">
              <div className="relative mb-4 size-20">
                <svg className="size-20 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-border"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary transition-colors duration-300"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="transparent"
                    strokeDasharray={`${dashboardData.profileCompletion?.percentage || 0}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-['Open_Sans'] text-xl font-bold text-foreground">
                    {dashboardData.profileCompletion?.percentage || 0}%
                  </span>
                </div>
              </div>

              <div className="text-center">
                {dashboardData.profileCompletion?.missingItems && dashboardData.profileCompletion.missingItems.length > 0 ? (
                  <div className="mb-3">
                    <p className="mb-2 font-['Roboto'] text-xs text-muted-foreground">Thiếu:</p>
                    <div className="space-y-1">
                      {dashboardData.profileCompletion.missingItems.slice(0, 2).map((item, index) => (
                        <Badge key={index} variant="secondary" className="mr-1 font-['Roboto'] font-normal">
                          {item}
                        </Badge>
                      ))}
                      {dashboardData.profileCompletion.missingItems.length > 2 && (
                        <span className="font-['Roboto'] text-xs text-muted-foreground">
                          +{dashboardData.profileCompletion.missingItems.length - 2} mục
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mb-3 font-['Roboto'] text-xs text-primary">Hồ sơ đã hoàn thiện!</p>
                )}

                <Button variant="default" size="sm" className="font-['Roboto']" asChild>
                  <Link to="/profile">Cập nhật hồ sơ</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="font-['Open_Sans'] text-base sm:text-lg">Thao tác nhanh</CardTitle>
              <Zap className="size-5 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Link
                to="/jobs"
                className="group flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-muted/80">
                  <Search className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-['Open_Sans'] font-medium text-foreground transition-colors group-hover:text-primary">
                    Duyệt việc làm
                  </span>
                  <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">Tìm cơ hội việc làm tiếp theo</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>

              <Link
                to="/profile"
                className="group flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-muted/80">
                  <User className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-['Open_Sans'] font-medium text-foreground transition-colors group-hover:text-primary">
                    Cập nhật hồ sơ
                  </span>
                  <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">Hoàn thiện thông tin của bạn</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>

              <Link
                to="/applicant/applications"
                className="group flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-muted/80">
                  <ClipboardList className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-['Open_Sans'] font-medium text-foreground transition-colors group-hover:text-primary">
                    Theo dõi đơn ứng tuyển
                  </span>
                  <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">Theo dõi tiến độ của bạn</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-2 border-b min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between sm:px-6">
              <CardTitle className="font-['Open_Sans'] text-base sm:text-lg">Đơn ứng tuyển gần đây</CardTitle>
              <Button variant="link" className="h-auto shrink-0 p-0 font-['Roboto'] text-primary" asChild>
                <Link to="/applicant/applications">Xem tất cả →</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4 max-w-xs" />
                            <Skeleton className="h-3 w-1/2 max-w-[200px]" />
                          </div>
                          <Skeleton className="h-6 w-16 shrink-0" />
                        </div>
                        <Skeleton className="h-3 w-full max-w-md" />
                        <div className="flex items-center justify-between gap-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </div>
                    ))
                  : dashboardData.recentApplications && dashboardData.recentApplications.length > 0
                    ? dashboardData.recentApplications.slice(0, 2).map(application => (
                        <div
                          key={application._id}
                          className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="mb-1 font-['Open_Sans'] text-sm font-medium text-foreground">
                                {application.job?.title || 'Vị trí ứng tuyển'}
                              </h3>
                              <p className="font-['Roboto'] font-mono text-xs text-muted-foreground">
                                <span className="font-['Roboto']">Mã tuyển dụng:</span>{' '}
                                {application.recruitmentCode || getRecruitmentCode(application.job)}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                'shrink-0 font-normal',
                                hrStatusBadgeClass(getInterviewPassFailBadgeKey(application) ?? application.status)
                              )}
                            >
                              {getInterviewPassFailLabel(application) ?? getStatusText(application.status)}
                            </Badge>
                          </div>
                          <div className="mb-3 font-['Roboto'] text-xs text-muted-foreground">
                            {application.job?.location || 'Chưa có địa điểm'} • {application.job?.type || 'Toàn thời gian'} •{' '}
                            {application.job?.salaryRange ? formatSalary(application.job.salaryRange) : 'Chưa có thông tin lương'}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-['Roboto'] text-xs text-muted-foreground">
                              Ứng tuyển {formatTimeAgo(application.appliedAt || application.createdAt)}
                            </span>
                            {application.job?._id ? (
                              <Button variant="default" size="sm" className="font-['Roboto']" asChild>
                                <Link to={`/jobs/${application.job._id}`}>Xem việc làm</Link>
                              </Button>
                            ) : (
                              <Badge variant="secondary" className="cursor-not-allowed font-['Roboto'] font-normal opacity-80">
                                Việc làm không khả dụng
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    : (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                          <ClipboardList className="mx-auto mb-4 size-12 text-muted-foreground/50" />
                          <p className="font-['Roboto'] text-sm text-muted-foreground">Chưa có đơn ứng tuyển gần đây</p>
                          <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">Bắt đầu ứng tuyển để xem đơn tại đây</p>
                        </div>
                      )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b sm:px-6">
              <CardTitle className="font-['Open_Sans'] text-base sm:text-lg">Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                {isLoading
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Skeleton className="size-8 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4 max-w-sm" />
                          <Skeleton className="h-3 w-1/2 max-w-[180px]" />
                        </div>
                      </div>
                    ))
                  : dashboardData.recentActivity.length > 0
                    ? dashboardData.recentActivity.map(activity => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">{getActivityIcon(activity.type)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="font-['Roboto'] text-sm text-foreground">{activity.message}</p>
                            <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">{activity.timestamp}</p>
                          </div>
                        </div>
                      ))
                    : (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                          <Info className="mx-auto mb-4 size-12 text-muted-foreground/50" />
                          <p className="font-['Roboto'] text-sm text-muted-foreground">Chưa có hoạt động gần đây</p>
                          <p className="mt-1 font-['Roboto'] text-sm text-muted-foreground">
                            Hoạt động đơn ứng tuyển sẽ hiển thị tại đây
                          </p>
                        </div>
                      )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ApplicantLayout>;
};
export default ApplicantDashboard;




