import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApiRequest } from '../../hooks/useApiRequest';
import HRLayout from '../layout/HRLayout';
import { HR_PAGE, HR_H1, HR_SUBTITLE } from '../hrLayoutClasses';
import { HR_INPUT_PILL, HR_TEXTAREA_PILL } from '../hrFormClasses';
import { hrStatusBadgeClass } from '../hrTheme';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, AlertCircle, X } from 'lucide-react';

import DateTimePicker from '../components/DateTimePicker';

const HREditJob = () => {
  const navigate = useNavigate();
  const {
    jobId
  } = useParams();
  const {
    makeJsonRequest
  } = useApiRequest();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formBusy = loading || isSubmitting;
  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    requirements: '',
    benefits: '',
    department: '',
    customDepartment: '',
    jobType: '',
    location: '',
    locationType: 'onsite',
    qualification: [],
    customQualifications: [],
    experienceLevel: '',
    requiredSkills: [],
    preferredSkills: [],
    salaryRange: {
      min: '',
      max: '',
      currency: 'VND',
      period: 'year',
      format: 'absolute'
    },
    applicationDeadline: '',
    maxApplicants: '',
    atsEnabled: false,
    atsEngine: 'gemini',
    atsResumeThreshold: 60,
    atsSkipWhenCoverLetter: false,
    resumeRequired: true,
    defaultInterviewRounds: [],
    defaultInterviewer: '',
    status: 'draft'
  });
  const [skillInput, setSkillInput] = useState('');
  const [preferredSkillInput, setPreferredSkillInput] = useState('');
  const [customQualificationInput, setCustomQualificationInput] = useState('');
  const departments = ['Kỹ thuật', 'Marketing', 'Nhân sự', 'Kinh doanh', 'Sản phẩm', 'Thiết kế', 'Tài chính', 'Vận hành', 'Chăm sóc khách hàng', 'Pháp lý', 'Khác'];
  const jobTypes = ['Toàn thời gian', 'Bán thời gian', 'Hợp đồng', 'Thời vụ', 'Thực tập', 'Tự do'];
  const experienceLevels = ['Mới vào nghề', 'Trung cấp', 'Cao cấp', 'Trưởng nhóm/Chuyên gia', 'Quản lý', 'Giám đốc bộ phận', 'Cấp điều hành'];
  const qualificationOptions = ['Cử nhân', 'Thạc sĩ', 'Tiến sĩ', 'Tốt nghiệp THPT', 'Cao đẳng', 'Chứng chỉ nghề nghiệp', 'Chứng chỉ nghề', 'Không yêu cầu bằng cấp'];
  const interviewRounds = ['Sơ loại qua điện thoại', 'Đánh giá kỹ thuật', 'Bài kiểm tra lập trình', 'Thiết kế hệ thống', 'Phỏng vấn hành vi', 'Phỏng vấn hội đồng', 'Phỏng vấn vòng cuối', 'Phỏng vấn phù hợp văn hóa'];
  const defaultInterviewers = ['Nguyễn Văn An — Trưởng phòng nhân sự', 'Trần Thị Bích — Kỹ sư cao cấp', 'Lê Minh Tuấn — Trưởng nhóm thiết kế', 'Phạm Quốc Huy — Quản lý sản phẩm', 'Đỗ Thu Hà — Trưởng nhóm kỹ thuật'];
  const jobStatusLabels = {
    active: 'Đang đăng tuyển',
    draft: 'Bản nháp',
    closed: 'Đã đóng',
    archived: 'Lưu trữ'
  };
  const handleInputChange = e => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;
    if (name.startsWith('salaryRange.')) {
      const field = name.split('.')[1];
      setJobData(prev => ({
        ...prev,
        salaryRange: {
          ...prev.salaryRange,
          [field]: value
        }
      }));
    } else {
      setJobData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  const handleArrayChange = (field, value) => {
    setJobData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const addSkill = type => {
    const input = type === 'required' ? skillInput : preferredSkillInput;
    const setInput = type === 'required' ? setSkillInput : setPreferredSkillInput;
    const field = type === 'required' ? 'requiredSkills' : 'preferredSkills';
    if (input.trim() && !jobData[field].includes(input.trim())) {
      setJobData(prev => ({
        ...prev,
        [field]: [...prev[field], input.trim()]
      }));
      setInput('');
    }
  };
  const removeSkill = (type, index) => {
    const field = type === 'required' ? 'requiredSkills' : 'preferredSkills';
    setJobData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };
  const addCustomQualification = () => {
    if (customQualificationInput.trim() && !jobData.qualification.includes(customQualificationInput.trim())) {
      setJobData(prev => ({
        ...prev,
        qualification: [...prev.qualification, customQualificationInput.trim()]
      }));
      setCustomQualificationInput('');
    }
  };
  const removeQualification = index => {
    setJobData(prev => ({
      ...prev,
      qualification: prev.qualification.filter((_, i) => i !== index)
    }));
  };
  const handleQualificationChange = qual => {
    if (jobData.qualification.includes(qual)) {
      setJobData(prev => ({
        ...prev,
        qualification: prev.qualification.filter(q => q !== qual)
      }));
    } else {
      setJobData(prev => ({
        ...prev,
        qualification: [...prev.qualification, qual]
      }));
    }
  };
  const handleInterviewRoundChange = round => {
    if (jobData.defaultInterviewRounds.includes(round)) {
      setJobData(prev => ({
        ...prev,
        defaultInterviewRounds: prev.defaultInterviewRounds.filter(r => r !== round)
      }));
    } else {
      setJobData(prev => ({
        ...prev,
        defaultInterviewRounds: [...prev.defaultInterviewRounds, round]
      }));
    }
  };
  const validateForm = () => {
    const errors = [];
    if (!jobData.title.trim()) errors.push('Vui lòng nhập chức danh tuyển dụng');
    if (!jobData.description.trim()) errors.push('Vui lòng nhập mô tả công việc');
    if (!jobData.department.trim() && !jobData.customDepartment.trim()) {
      errors.push('Vui lòng chọn hoặc nhập phòng ban');
    }
    if (!jobData.jobType) errors.push('Vui lòng chọn loại hình công việc');
    if (!jobData.location.trim()) errors.push('Vui lòng nhập địa điểm làm việc');
    if (!jobData.experienceLevel) errors.push('Vui lòng chọn cấp bậc kinh nghiệm');
    if (jobData.salaryRange.min && jobData.salaryRange.max) {
      const minValue = parseFloat(jobData.salaryRange.min);
      const maxValue = parseFloat(jobData.salaryRange.max);
      if (minValue >= maxValue) {
        errors.push('Mức lương tối đa phải lớn hơn mức tối thiểu');
      }
    }
    if (!jobData.applicationDeadline) {
      errors.push('Vui lòng chọn hạn nộp hồ sơ');
    }
    return errors;
  };
  const handleSubmit = async (e, actionType = 'save') => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const finalDepartment = jobData.customDepartment.trim() || jobData.department;
      const finalQualifications = [...jobData.qualification, ...jobData.customQualifications];
      const processSalaryValue = value => {
        if (!value) return null;
        const numValue = parseFloat(value);
        return numValue.toString();
      };
      const submitData = {
        ...jobData,
        department: finalDepartment,
        qualification: finalQualifications,
        status: actionType === 'publish' ? 'active' : jobData.status,
        salaryRange: {
          ...jobData.salaryRange,
          min: processSalaryValue(jobData.salaryRange.min),
          max: processSalaryValue(jobData.salaryRange.max),
          currency: jobData.salaryRange.currency || 'VND',
          format: 'absolute'
        },
        applicationDeadline: jobData.applicationDeadline,
        maxApplicants: jobData.maxApplicants ? parseInt(jobData.maxApplicants) : null,
        atsEnabled: !!jobData.atsEnabled,
        atsEngine: jobData.atsEnabled ? (jobData.atsEngine === 'scan_cv' ? 'scan_cv' : 'gemini') : 'gemini',
        atsResumeThreshold: jobData.atsEnabled ? Number(jobData.atsResumeThreshold) || 60 : undefined,
        atsSkipWhenCoverLetter: jobData.atsEnabled ? !!jobData.atsSkipWhenCoverLetter : false
      };
      Object.keys(submitData).forEach(key => {
        if (key !== 'requirements' && key !== 'benefits' && (submitData[key] === '' || Array.isArray(submitData[key]) && submitData[key].length === 0)) {
          delete submitData[key];
        }
      });
      const response = await makeJsonRequest(`/api/hr/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      if (response.success) {
        navigate('/hr/jobs', {
          state: {
            message: actionType === 'publish' ? 'Đã đăng tin thành công.' : 'Đã cập nhật tin thành công.',
            type: 'success'
          }
        });
      } else {
        setError(response.message || `Không thể ${actionType === 'publish' ? 'đăng' : 'cập nhật'} tin tuyển dụng`);
      }
    } catch (error) {
      console.error('Error updating job:', error);
      setError(error.message || `Không thể ${actionType === 'publish' ? 'đăng' : 'cập nhật'} tin tuyển dụng`);
    } finally {
      setIsSubmitting(false);
    }
  };
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await makeJsonRequest(`/api/hr/jobs/${jobId}`);
        if (response.success) {
          const job = response.data;
          const processSalaryForDisplay = value => {
            if (!value) return '';
            const numValue = parseFloat(value);
            return numValue.toString();
          };
          setJobData(prev => ({
            ...prev,
            title: job.title || '',
            description: job.description || '',
            requirements: job.requirements || '',
            benefits: job.benefits || '',
            department: job.department || '',
            customDepartment: '',
            jobType: job.jobType || '',
            location: job.location || '',
            locationType: job.locationType || 'onsite',
            qualification: job.qualification || [],
            customQualifications: [],
            experienceLevel: job.experienceLevel || '',
            requiredSkills: job.requiredSkills || [],
            preferredSkills: job.preferredSkills || [],
            salaryRange: {
              min: processSalaryForDisplay(job.salaryRange?.min),
              max: processSalaryForDisplay(job.salaryRange?.max),
              currency: job.salaryRange?.currency || 'VND',
              period: job.salaryRange?.period || 'year',
              format: 'absolute'
            },
            applicationDeadline: job.applicationDeadline || '',
            maxApplicants: job.maxApplicants || '',
            atsEnabled: !!job.atsEnabled,
            atsEngine: job.atsEngine === 'scan_cv' ? 'scan_cv' : 'gemini',
            atsResumeThreshold: typeof job.atsResumeThreshold === 'number' ? job.atsResumeThreshold : 60,
            atsSkipWhenCoverLetter: !!job.atsSkipWhenCoverLetter,
            resumeRequired: job.resumeRequired !== false,
            defaultInterviewRounds: job.defaultInterviewRounds || [],
            defaultInterviewer: job.defaultInterviewer || '',
            status: job.status || 'draft'
          }));
        } else {
          setError(response.message || 'Không thể tải chi tiết tin tuyển dụng');
        }
      } catch (error) {
        console.error('Error fetching job details:', error);
        setError(error.message || 'Không thể tải chi tiết tin tuyển dụng');
      } finally {
        setLoading(false);
      }
    };
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId, makeJsonRequest]);
  if (loading) {
    return <HRLayout>
        <div className={HR_PAGE}>
          <div className="flex flex-col items-center justify-center gap-3 py-12 sm:flex-row">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <span className="font-['Roboto'] text-muted-foreground">Đang tải chi tiết tin tuyển dụng...</span>
          </div>
        </div>
      </HRLayout>;
  }
  if (error && !jobData.title) {
    return <HRLayout>
        <div className={HR_PAGE}>
          <Alert variant="destructive" className="max-w-2xl border-destructive/50">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-['Roboto']">Lỗi</AlertTitle>
            <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
            <div className="mt-4">
            <Button type="button" variant="outline" className="font-['Roboto']" onClick={() => navigate('/hr/jobs')} disabled={formBusy}>
                Quay lại danh sách tin
              </Button>
            </div>
          </Alert>
        </div>
      </HRLayout>;
  }
  return <HRLayout>
      <div className={HR_PAGE}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={HR_H1}>Chỉnh sửa tin tuyển dụng</h1>
            <p className={HR_SUBTITLE}>Cập nhật thông tin tin tuyển dụng</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground font-['Roboto']">Trạng thái hiện tại:</span>
              <Badge variant="outline" className={cn("rounded-full font-['Roboto']", hrStatusBadgeClass(jobData.status))}>
                {jobStatusLabels[jobData.status] || jobData.status}
              </Badge>
            </div>
          </div>
          <Button type="button" variant="outline" className="font-['Roboto'] shrink-0" onClick={() => navigate('/hr/jobs')} disabled={formBusy}>
            <ArrowLeft className="mr-2 size-4" />
            Quay lại danh sách tin
          </Button>
        </div>
        {error && <Alert variant="destructive" className="mb-6 border-destructive/50">
            <AlertCircle className="size-4" />
            <AlertTitle className="font-['Roboto']">Lỗi</AlertTitle>
            <AlertDescription className="font-['Roboto']">{error}</AlertDescription>
          </Alert>}

        <form onSubmit={handleSubmit} className="space-y-8" aria-busy={formBusy}>
          <fieldset disabled={formBusy} className="min-w-0 border-0 p-0 m-0 space-y-8 disabled:opacity-[0.9]">
          <Card className="border-border shadow-sm">
            <CardContent className="space-y-6 pt-6">
            <h2 className="font-['Open_Sans'] text-xl font-semibold text-foreground">Thông tin cơ bản</h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="title" className="mb-2 block font-['Roboto'] text-foreground">
                  Tên công việc *
                </Label>
                <input type="text" id="title" name="title" value={jobData.title} onChange={handleInputChange} className={HR_INPUT_PILL} placeholder="Chức danh tuyển dụng" required />
              </div>
              <div>
                <Label htmlFor="department" className="mb-2 block font-['Roboto'] text-foreground">
                  Phòng ban *
                </Label>
                <select id="department" name="department" value={jobData.department} onChange={handleInputChange} className={HR_INPUT_PILL} required={!jobData.customDepartment}>
                  <option value="">Chọn phòng ban</option>
                  {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  <option value="Khác">Khác</option>
                </select>
                {jobData.department === 'Khác' && <input type="text" name="customDepartment" value={jobData.customDepartment} onChange={handleInputChange} className={`${HR_INPUT_PILL} mt-2`} placeholder="Tên phòng ban" />}
              </div>
              <div>
                <Label htmlFor="jobType" className="mb-2 block font-['Roboto'] text-foreground">
                  Loại công việc *
                </Label>
                <select id="jobType" name="jobType" value={jobData.jobType} onChange={handleInputChange} className={HR_INPUT_PILL} required>
                  <option value="">Chọn loại công việc</option>
                  {jobTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="location" className="mb-2 block font-['Roboto'] text-foreground">
                  Địa điểm *
                </Label>
                <input type="text" id="location" name="location" value={jobData.location} onChange={handleInputChange} className={HR_INPUT_PILL} placeholder="Địa điểm làm việc" required />
              </div>
              <div>
                <Label htmlFor="locationType" className="mb-2 block font-['Roboto'] text-foreground">
                  Hình thức làm việc
                </Label>
                <select id="locationType" name="locationType" value={jobData.locationType} onChange={handleInputChange} className={HR_INPUT_PILL}>
                  <option value="onsite">Tại văn phòng</option>
                  <option value="remote">Từ xa</option>
                  <option value="hybrid">Kết hợp</option>
                </select>
              </div>
              <div>
                <Label htmlFor="experienceLevel" className="mb-2 block font-['Roboto'] text-foreground">
                  Cấp bậc kinh nghiệm *
                </Label>
                <select id="experienceLevel" name="experienceLevel" value={jobData.experienceLevel} onChange={handleInputChange} className={HR_INPUT_PILL} required>
                  <option value="">Chọn cấp bậc kinh nghiệm</option>
                  {experienceLevels.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6">
              <Label htmlFor="description" className="mb-2 block font-['Roboto'] text-foreground">
                Mô tả công việc *
              </Label>
              <textarea id="description" name="description" rows={6} value={jobData.description} onChange={handleInputChange} className={HR_TEXTAREA_PILL} placeholder="Mô tả vai trò, trách nhiệm và công việc cần thực hiện" required />
            </div>

            <div className="mt-6">
              <Label htmlFor="requirements" className="mb-2 block font-['Roboto'] text-foreground">
                Yêu cầu ứng viên
              </Label>
              <textarea id="requirements" name="requirements" rows={6} value={jobData.requirements || ''} onChange={handleInputChange} className={HR_TEXTAREA_PILL} placeholder="Yêu cầu kinh nghiệm, kỹ năng chuyên môn..." />
            </div>

            <div className="mt-6">
              <Label htmlFor="benefits" className="mb-2 block font-['Roboto'] text-foreground">
                Quyền lợi ứng viên
              </Label>
              <textarea id="benefits" name="benefits" rows={6} value={jobData.benefits || ''} onChange={handleInputChange} className={HR_TEXTAREA_PILL} placeholder="Mô tả chế độ đãi ngộ, lương thưởng, bảo hiểm..." />
            </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="space-y-6 pt-6">
            <h2 className="font-['Open_Sans'] text-xl font-semibold text-foreground">Kỹ năng & Yêu cầu</h2>
            <div className="mb-6">
              <Label className="mb-2 block font-['Roboto'] text-foreground">
                Kỹ năng bắt buộc
              </Label>
              <div className="mb-3 flex items-center gap-2">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill('required'))} className={`flex-1 ${HR_INPUT_PILL}`} placeholder="Kỹ năng bắt buộc" />
                <Button type="button" variant="outline" className="shrink-0 font-['Roboto']" onClick={() => addSkill('required')}>
                  Thêm
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobData.requiredSkills.map((skill, index) => <Badge key={index} variant="outline" className="h-auto gap-0.5 rounded-full border-primary/30 bg-primary/10 py-1 pl-2.5 pr-0.5 text-sm font-normal text-primary">
                    {skill}
                    <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 text-primary hover:bg-primary/20" onClick={() => removeSkill('required', index)} aria-label="Xóa kỹ năng">
                      <X className="size-3.5" />
                    </Button>
                  </Badge>)}
              </div>
            </div>
            <div className="mb-6">
              <Label className="mb-2 block font-['Roboto'] text-foreground">
                Kỹ năng ưu tiên
              </Label>
              <div className="mb-3 flex items-center gap-2">
                <input type="text" value={preferredSkillInput} onChange={e => setPreferredSkillInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill('preferred'))} className={`flex-1 ${HR_INPUT_PILL}`} placeholder="Kỹ năng ưu tiên" />
                <Button type="button" variant="outline" className="shrink-0 font-['Roboto']" onClick={() => addSkill('preferred')}>
                  Thêm
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobData.preferredSkills.map((skill, index) => <Badge key={index} variant="secondary" className="h-auto gap-0.5 rounded-full py-1 pl-2.5 pr-0.5 text-sm font-normal">
                    {skill}
                    <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 hover:bg-muted" onClick={() => removeSkill('preferred', index)} aria-label="Xóa kỹ năng">
                      <X className="size-3.5" />
                    </Button>
                  </Badge>)}
              </div>
            </div>
            <div>
              <Label className="mb-2 block font-['Roboto'] text-foreground">
                Bằng cấp/Yêu cầu bắt buộc
              </Label>
              <div className="mb-4 grid max-h-40 grid-cols-1 gap-3 overflow-y-auto rounded-2xl border border-border bg-muted/30 p-3 md:grid-cols-2">
                {qualificationOptions.map(qual => <label key={qual} className="flex cursor-pointer items-center">
                    <input type="checkbox" checked={jobData.qualification.includes(qual)} onChange={() => handleQualificationChange(qual)} className="size-4 rounded border-border bg-background text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                    <span className="ml-2 font-['Roboto'] text-sm text-foreground">{qual}</span>
                  </label>)}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input type="text" value={customQualificationInput} onChange={e => setCustomQualificationInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCustomQualification())} className={`flex-1 ${HR_INPUT_PILL}`} placeholder="Yêu cầu bổ sung" />
                <Button type="button" variant="secondary" className="shrink-0 font-['Roboto']" onClick={addCustomQualification}>
                  Thêm
                </Button>
              </div>
              {jobData.qualification.filter(qual => !qualificationOptions.includes(qual)).length > 0 && <div className="mt-3 flex flex-wrap gap-2">
                  {jobData.qualification.filter(qual => !qualificationOptions.includes(qual)).map((qual, index) => <Badge key={`custom-${index}`} variant="secondary" className="h-auto gap-0.5 rounded-full py-1 pl-2.5 pr-0.5 text-sm font-normal">
                      {qual}
                      <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 hover:bg-muted" onClick={() => removeQualification(jobData.qualification.indexOf(qual))} aria-label="Xóa yêu cầu">
                        <X className="size-3.5" />
                      </Button>
                    </Badge>)}
                </div>}
            </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="space-y-6 pt-6">
            <h2 className="font-['Open_Sans'] text-xl font-semibold text-foreground">Lương & Thông tin khác</h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 lg:col-span-3">
                <div>
                  <Label htmlFor="salaryRange-min" className="mb-2 block font-['Roboto'] text-foreground">Lương tối thiểu</Label>
                  <input type="number" id="salaryRange-min" name="salaryRange.min" value={jobData.salaryRange.min} onChange={handleInputChange} className={HR_INPUT_PILL} placeholder="5000000" step="1000" />
                </div>

                <div>
                  <Label htmlFor="salaryRange-max" className="mb-2 block font-['Roboto'] text-foreground">Lương tối đa</Label>
                  <input type="number" id="salaryRange-max" name="salaryRange.max" value={jobData.salaryRange.max} onChange={handleInputChange} className={HR_INPUT_PILL} placeholder="10000000" step="1000" />
                </div>

                <div>
                  <Label htmlFor="salaryRange-currency" className="mb-2 block font-['Roboto'] text-foreground">Tiền tệ</Label>
                  <select id="salaryRange-currency" name="salaryRange.currency" value={jobData.salaryRange.currency} onChange={handleInputChange} className={HR_INPUT_PILL}>
                    <option value="VND">VNĐ</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="salaryRange-period" className="mb-2 block font-['Roboto'] text-foreground">Chu kỳ</Label>
                  <select id="salaryRange-period" name="salaryRange.period" value={jobData.salaryRange.period} onChange={handleInputChange} className={HR_INPUT_PILL}>
                    <option value="year">Mỗi năm</option>
                    <option value="month">Mỗi tháng</option>
                    <option value="hour">Mỗi giờ</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="applicationDeadline" className="mb-2 block font-['Roboto'] text-foreground">
                  Hạn nộp hồ sơ
                </Label>
                <DateTimePicker
                  value={jobData.applicationDeadline}
                  onChange={val => handleArrayChange('applicationDeadline', val)}
                  placeholder="Chọn ngày và giờ hạn nộp..."
                  minDate={new Date().toISOString()}
                />
              </div>
              <div>
                <Label htmlFor="maxApplicants" className="mb-2 block font-['Roboto'] text-foreground">
                  Số ứng viên tối đa
                </Label>
                <input type="number" id="maxApplicants" name="maxApplicants" value={jobData.maxApplicants} onChange={handleInputChange} className={HR_INPUT_PILL} placeholder="Giới hạn số hồ sơ" />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                <p className="font-['Roboto'] text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Tóm tắt:</span>{' '}
                  Bật lọc, đặt ngưỡng %, chọn kiểu chấm điểm, tùy chọn miễn lọc khi có thư giới thiệu.
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-['Open_Sans'] text-sm font-medium text-foreground">Bật sàng lọc tự động</h4>
                    <p className="font-['Roboto'] text-xs text-muted-foreground">Hồ sơ dưới ngưỡng bị từ chối; hồ sơ đạt ngưỡng gửi thông báo cho bộ phận tuyển dụng.</p>
                  </div>
                  <input type="checkbox" id="atsEnabled" name="atsEnabled" checked={jobData.atsEnabled} onChange={handleInputChange} className="size-4 shrink-0 rounded border-border bg-background text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                {jobData.atsEnabled && <div className="space-y-3 border-t border-border pt-2">
                    <div>
                      <Label htmlFor="atsResumeThreshold" className="mb-1 block font-['Roboto'] text-foreground">Ngưỡng điểm hồ sơ tối thiểu (%)</Label>
                      <input type="number" id="atsResumeThreshold" name="atsResumeThreshold" min="0" max="100" step="1" value={jobData.atsResumeThreshold} onChange={handleInputChange} className={HR_INPUT_PILL} />
                      <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">Điểm thấp hơn ngưỡng thì hồ sơ chuyển sang từ chối tự động.</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-['Open_Sans'] text-sm font-medium text-foreground">Kiểu chấm điểm</p>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3">
                        <input type="radio" name="atsEngine" checked={jobData.atsEngine === 'gemini'} onChange={() => setJobData(prev => ({
                      ...prev,
                      atsEngine: 'gemini'
                    }))} className="text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                        <span className="font-['Roboto'] text-sm font-medium text-foreground">Bản version 1</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3">
                        <input type="radio" name="atsEngine" checked={jobData.atsEngine === 'scan_cv'} onChange={() => setJobData(prev => ({
                      ...prev,
                      atsEngine: 'scan_cv'
                    }))} className="text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                        <span className="font-['Roboto'] text-sm font-medium text-foreground">Bản version 2</span>
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-['Open_Sans'] text-sm font-medium text-foreground">Không áp ngưỡng khi có thư giới thiệu</p>
                        <p className="mt-0.5 font-['Roboto'] text-xs text-muted-foreground">Khi bật: có thư giới thiệu thì không tự động từ chối vì điểm sàng lọc.</p>
                      </div>
                      <input type="checkbox" id="atsSkipWhenCoverLetter" name="atsSkipWhenCoverLetter" checked={jobData.atsSkipWhenCoverLetter} onChange={handleInputChange} className="size-4 shrink-0 rounded border-border bg-background text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                    </div>
                  </div>}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <Label htmlFor="resumeRequired" className="flex-1 cursor-pointer font-['Roboto'] text-sm font-medium text-foreground">
                  Bắt buộc nộp hồ sơ xin việc
                </Label>
                <input type="checkbox" id="resumeRequired" name="resumeRequired" checked={jobData.resumeRequired} onChange={handleInputChange} className="size-4 shrink-0 rounded border-border bg-background text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" className="w-full font-['Roboto'] sm:w-auto" onClick={() => navigate('/hr/jobs')}>
              Hủy
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <Button type="submit" variant="secondary" disabled={isSubmitting} className="w-full font-['Roboto'] sm:w-auto">
                {isSubmitting ? <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Đang cập nhật...
                  </> : 'Cập nhật tin đăng'}
              </Button>
              {jobData.status === 'draft' && <Button type="button" className="w-full font-['Roboto'] sm:w-auto" onClick={e => handleSubmit(e, 'publish')} disabled={isSubmitting || validateForm().length > 0}>
                  Cập nhật & Đăng tin
                </Button>}
            </div>
          </div>
          </fieldset>
        </form>
      </div>
    </HRLayout>;
};
export default HREditJob;




