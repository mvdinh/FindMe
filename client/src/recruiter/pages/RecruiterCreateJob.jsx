import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiRequest } from '../../hooks/useApiRequest';
import { useToast } from '../../contexts/ToastContext';
import RecruiterLayout from '../layout/RecruiterLayout';
import { HR_PAGE, HR_H1, HR_SUBTITLE } from '../recruiterLayoutClasses';
import { HR_INPUT_PILL, HR_TEXTAREA_PILL, HR_TOGGLE_TRACK } from '../recruiterFormClasses';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, X } from 'lucide-react';

import DateTimePicker from '../components/DateTimePicker';

const INITIAL_JOB_STATE = {
  title: '',
  description: '',
  requirements: '',
  benefits: '',
  jobType: '',
  location: '',
  locationType: 'onsite',
  qualification: [],
  customQualifications: [],
  experienceLevel: '',
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
  atsEngine: 'scan_cv',
  atsResumeThreshold: 60,
  atsSkipWhenCoverLetter: false,
  resumeRequired: true,
  defaultInterviewRounds: [],
  defaultInterviewer: '',
  status: 'draft'
};

const RecruiterCreateJob = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    makeJsonRequest
  } = useApiRequest();
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [jobData, setJobData] = useState(INITIAL_JOB_STATE);
  const [skillInput, setSkillInput] = useState('');
  const [preferredSkillInput, setPreferredSkillInput] = useState('');
  const [customQualificationInput, setCustomQualificationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formBusy = isSubmitting;
  const getSampleDeadline = () => {
    const today = new Date();
    const inSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    inSevenDays.setHours(18, 0, 0, 0); // 18:00
    return inSevenDays.toISOString();
  };
  const seedDeveloperJob = () => {
    const deadline = getSampleDeadline();
    setJobData({
      title: 'Lập trình viên Fullstack',
      description: 'findme đang tìm Lập trình viên Fullstack để tham gia xây dựng và phát triển nền tảng hệ thống với quy mô lớn. Bạn sẽ làm việc cùng với đội ngũ Product và Design để tạo ra các tính năng hữu ích cho người dùng.',
      requirements: '- Tối thiểu 2 năm kinh nghiệm làm việc với React/Vue cho Frontend và Node.js/Java cho Backend.\n- Nắm vững kiến thức về cơ sở dữ liệu quan hệ và NoSQL.\n- Tư duy giải quyết vấn đề tốt, sẵn sàng học hỏi công nghệ mới.',
      benefits: '- Mức lương cạnh tranh từ 20,000,000 - 35,000,000 VNĐ.\n- Chế độ bảo hiểm sức khỏe đầy đủ, thưởng tháng 13.\n- Làm việc trong môi trường năng động, thoải mái.',
      jobType: 'Full-time',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      locationType: 'hybrid',
      qualification: ['Đại học trở lên'],
      customQualifications: [],
      experienceLevel: 'Middle',
      salaryRange: {
        min: '20000000',
        max: '35000000',
        currency: 'VND',
        period: 'month',
        format: 'absolute'
      },
      applicationDeadline: deadline,
      maxApplicants: '',
      atsEnabled: false,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 60,
      atsSkipWhenCoverLetter: false,
      resumeRequired: true,
      defaultInterviewRounds: ['Phỏng vấn kỹ thuật', 'Phỏng vấn nhân sự'],
      defaultInterviewer: '',
      status: 'draft'
    });
  };
  const seedMarketingJob = () => {
    const deadline = getSampleDeadline();
    setJobData({
      title: 'Chuyên viên Digital Marketing',
      description: 'Chúng tôi đang tìm kiếm Chuyên viên Digital Marketing có đam mê với số liệu và hiệu suất chiến dịch. Bạn sẽ trực tiếp lên kế hoạch và chạy các chiến dịch trên Facebook Ads, Google Ads để mang lại khách hàng tiềm năng.',
      requirements: '- Kinh nghiệm từ 1-2 năm thực chiến chạy quảng cáo Facebook, Google.\n- Có khả năng phân tích dữ liệu, theo dõi và tối ưu hóa CPL, CPA.\n- Hiểu biết về SEO và Content Marketing là một lợi thế.',
      benefits: '- Thu nhập hấp dẫn từ 15,000,000 - 25,000,000 VNĐ + Thưởng KPI.\n- Được cấp ngân sách chạy Ads lớn, cơ hội học hỏi cao.\n- Tham gia các hoạt động team building định kỳ của công ty.',
      jobType: 'Full-time',
      location: 'Hà Nội, Việt Nam',
      locationType: 'onsite',
      qualification: ['Đại học trở lên'],
      customQualifications: [],
      experienceLevel: 'Junior',
      salaryRange: {
        min: '15000000',
        max: '25000000',
        currency: 'VND',
        period: 'month',
        format: 'absolute'
      },
      applicationDeadline: deadline,
      maxApplicants: '',
      atsEnabled: true,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 65,
      atsSkipWhenCoverLetter: true,
      resumeRequired: true,
      defaultInterviewRounds: ['Phỏng vấn chuyên môn', 'Phỏng vấn văn hóa'],
      defaultInterviewer: '',
      status: 'draft'
    });
  };
  const seedLogisticsJob = () => {
    const deadline = getSampleDeadline();
    setJobData({
      title: 'Nhân viên Điều phối Logistics',
      description: 'Cần tuyển Nhân viên Điều phối Logistics để quản lý quy trình giao nhận vận tải hàng ngày. Bạn sẽ kết nối trực tiếp với tài xế, đối tác vận chuyển và kho bãi nhằm đảm bảo hàng hóa được giao đúng hẹn và an toàn.',
      requirements: '- Tốt nghiệp Cao đẳng/Đại học các ngành Logistics, Quản lý chuỗi cung ứng.\n- Kỹ năng xử lý tình huống nhanh nhạy, chịu được áp lực cao.\n- Có khả năng giao tiếp và đàm phán tốt với đối tác.',
      benefits: '- Lương cứng 10,000,000 - 15,000,000 VNĐ, phụ cấp ăn trưa, điện thoại.\n- Môi trường ổn định, phúc lợi rõ ràng, đóng bảo hiểm theo luật.\n- Cơ hội thăng tiến lên Trưởng nhóm Điều phối sau 1 năm.',
      jobType: 'Full-time',
      location: 'Bình Dương, Việt Nam',
      locationType: 'onsite',
      qualification: ['Bằng cấp 3'],
      customQualifications: [],
      experienceLevel: 'Fresher',
      salaryRange: {
        min: '10000000',
        max: '15000000',
        currency: 'VND',
        period: 'month',
        format: 'absolute'
      },
      applicationDeadline: deadline,
      maxApplicants: '',
      atsEnabled: false,
      atsEngine: 'scan_cv',
      atsResumeThreshold: 60,
      atsSkipWhenCoverLetter: true,
      resumeRequired: false,
      defaultInterviewRounds: ['Phỏng vấn trực tiếp'],
      defaultInterviewer: '',
      status: 'draft'
    });
  };
  const departments = ['Kỹ thuật', 'Marketing', 'Nhân sự', 'Kinh doanh', 'Sản phẩm', 'Thiết kế', 'Tài chính', 'Vận hành', 'Chăm sóc khách hàng', 'Khoa học dữ liệu', 'Đảm bảo chất lượng', 'An ninh', 'Pháp lý', 'Hành chính', 'Khác'];
  const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance'];
  const qualifications = ['Đại học trở lên', 'Không yêu cầu bằng cấp', 'Bằng cấp 3'];
  const experienceLevels = ['Fresher', 'Junior', 'Middle', 'Senior', 'Tech Lead', 'Manager', 'Director'];
  const handleInputChange = (field, value) => {
    if (typeof field === 'object' && field.target) {
      const {
        name,
        value: inputValue,
        type,
        checked
      } = field.target;
      if (name.startsWith('salaryRange.')) {
        const salaryField = name.split('.')[1];
        setJobData(prev => ({
          ...prev,
          salaryRange: {
            ...prev.salaryRange,
            [salaryField]: inputValue
          }
        }));
      } else {
        setJobData(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : inputValue
        }));
      }
    } else {
      setJobData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  const handleSkillAdd = skillType => {
    const input = skillType === 'required' ? skillInput : preferredSkillInput;
    if (input.trim()) {
      const skillArray = skillType === 'required' ? 'requiredSkills' : 'preferredSkills';
      setJobData(prev => ({
        ...prev,
        [skillArray]: [...prev[skillArray], input.trim()]
      }));
      if (skillType === 'required') {
        setSkillInput('');
      } else {
        setPreferredSkillInput('');
      }
    }
  };
  const handleSkillRemove = (skillType, index) => {
    const skillArray = skillType === 'required' ? 'requiredSkills' : 'preferredSkills';
    setJobData(prev => ({
      ...prev,
      [skillArray]: prev[skillArray].filter((_, i) => i !== index)
    }));
  };
  const addCustomQualification = () => {
    if (customQualificationInput.trim() && !jobData.customQualifications.includes(customQualificationInput.trim())) {
      setJobData(prev => ({
        ...prev,
        customQualifications: [...prev.customQualifications, customQualificationInput.trim()]
      }));
      setCustomQualificationInput('');
    }
  };
  const removeCustomQualification = qualification => {
    setJobData(prev => ({
      ...prev,
      customQualifications: prev.customQualifications.filter(q => q !== qualification)
    }));
  };
  const toggleQualification = qualification => {
    setJobData(prev => ({
      ...prev,
      qualification: prev.qualification.includes(qualification) ? prev.qualification.filter(q => q !== qualification) : [...prev.qualification, qualification]
    }));
  };
  const handleInterviewRoundToggle = round => {
    setJobData(prev => ({
      ...prev,
      defaultInterviewRounds: prev.defaultInterviewRounds.includes(round) ? prev.defaultInterviewRounds.filter(r => r !== round) : [...prev.defaultInterviewRounds, round]
    }));
  };
  const handleSubmit = async status => {
    setIsSubmitting(true);
    try {
      if (!jobData.title.trim()) {
        toast.warning('Vui lòng nhập tên công việc');
        return;
      }
      if (!jobData.description.trim()) {
        toast.warning('Vui lòng nhập mô tả công việc');
        return;
      }

      if (jobData.qualification.length === 0 && jobData.customQualifications.length === 0) {
        toast.warning('Vui lòng chọn ít nhất một bằng cấp/yêu cầu');
        return;
      }
      if (!jobData.experienceLevel) {
        toast.warning('Vui lòng chọn cấp bậc kinh nghiệm');
        return;
      }
      if (!jobData.applicationDeadline) {
        toast.warning('Vui lòng chọn hạn nộp hồ sơ');
        return;
      }
      if (jobData.atsEnabled) {
        const threshold = Number(jobData.atsResumeThreshold);
        if (Number.isNaN(threshold) || threshold < 0 || threshold > 100) {
          toast.warning('Ngưỡng điểm sàng lọc hồ sơ phải từ 0 đến 100.');
          return;
        }
      }
      const processSalaryValue = value => {
        if (!value) return '';
        const numValue = parseFloat(value);
        return numValue.toString();
      };
      const submitData = {
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
        benefits: jobData.benefits,
        jobType: jobData.jobType || undefined,
        location: jobData.location,
        locationType: jobData.locationType ? jobData.locationType.charAt(0).toUpperCase() + jobData.locationType.slice(1).toLowerCase() : 'Onsite',
        salaryRange: {
          min: processSalaryValue(jobData.salaryRange.min),
          max: processSalaryValue(jobData.salaryRange.max),
          currency: jobData.salaryRange.currency,
          period: jobData.salaryRange.period,
          format: 'absolute'
        },
        qualification: [...jobData.qualification, ...jobData.customQualifications],
        experienceLevel: jobData.experienceLevel || undefined,
        applicationDeadline: jobData.applicationDeadline || undefined,
        maxApplicants: jobData.maxApplicants ? Number(jobData.maxApplicants) : undefined,
        atsEnabled: !!jobData.atsEnabled,
        atsEngine: jobData.atsEnabled ? (jobData.atsEngine === 'scan_cv' ? 'scan_cv' : 'gemini') : 'gemini',
        atsResumeThreshold: jobData.atsEnabled ? Number(jobData.atsResumeThreshold) || 60 : undefined,
        atsSkipWhenCoverLetter: jobData.atsEnabled ? !!jobData.atsSkipWhenCoverLetter : false,
        resumeRequired: jobData.resumeRequired ?? true,
        defaultInterviewRounds: jobData.defaultInterviewRounds || [],
        defaultInterviewer: jobData.defaultInterviewer || '',
        status
      };
      const response = await makeJsonRequest('/api/recruiter/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      if (response.success) {
        toast.success(`Tin tuyển dụng đã ${status === 'draft' ? 'được lưu bản nháp' : 'được đăng'} thành công!`);
        navigate('/recruiter/jobs', {
          state: {
            refreshJobs: true
          }
        });
      } else {
        console.error('Job creation failed:', response);
        toast.error(response.message || 'Không thể tạo tin tuyển dụng');
      }
    } catch (error) {
      console.error('Error submitting job:', error);
      let errMsg = String(error?.message || '');
      if (error?.response?.data?.errors?.length > 0) {
        errMsg = error.response.data.errors.map(e => e.message).join(', ');
      }
      if (errMsg === 'Authentication required' || errMsg.includes('401') || /đăng nhập|xác thực/i.test(errMsg)) {
        toast.error('Phiên làm việc hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.');
        navigate('/login');
      } else {
        toast.error(errMsg || 'Không thể tạo tin tuyển dụng');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const isFormValid = () => {
    return jobData.title.trim() && jobData.description.trim() && jobData.jobType && jobData.qualification && jobData.experienceLevel && jobData.applicationDeadline;
  };
  return <RecruiterLayout>
      <div className={HR_PAGE}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" aria-busy={formBusy}>
          <div>
            <h1 className={HR_H1}>Tạo tin tuyển dụng</h1>
            <p className={HR_SUBTITLE}>Đăng tin mới trên findme và tiếp cận ứng viên phù hợp</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <Button
              type="button"
              size="sm"
              variant={activeTemplate === 'developer' ? 'default' : 'outline'}
              className={`font-['Roboto'] ${activeTemplate === 'developer' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => {
                if (activeTemplate === 'developer') {
                  setActiveTemplate(null);
                  setJobData(INITIAL_JOB_STATE);
                } else {
                  setActiveTemplate('developer');
                  seedDeveloperJob();
                }
              }}
              disabled={formBusy}
            >
              Mẫu Lập trình viên
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTemplate === 'marketing' ? 'default' : 'outline'}
              className={`font-['Roboto'] ${activeTemplate === 'marketing' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => {
                if (activeTemplate === 'marketing') {
                  setActiveTemplate(null);
                  setJobData(INITIAL_JOB_STATE);
                } else {
                  setActiveTemplate('marketing');
                  seedMarketingJob();
                }
              }}
              disabled={formBusy}
            >
              Mẫu Marketing
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTemplate === 'logistics' ? 'default' : 'outline'}
              className={`font-['Roboto'] ${activeTemplate === 'logistics' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => {
                if (activeTemplate === 'logistics') {
                  setActiveTemplate(null);
                  setJobData(INITIAL_JOB_STATE);
                } else {
                  setActiveTemplate('logistics');
                  seedLogisticsJob();
                }
              }}
              disabled={formBusy}
            >
              Mẫu Logistics
            </Button>
            <Button type="button" variant="outline" className="font-['Roboto']" onClick={() => navigate('/recruiter/jobs')} disabled={formBusy}>
              <ArrowLeft className="mr-2 size-4" />
              Quay lại danh sách tin
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <fieldset disabled={formBusy} className="lg:col-span-2 space-y-6 min-w-0 border-0 p-0 m-0 disabled:opacity-[0.9]">
            <Card className="shadow-sm overflow-visible">
              <CardContent className="pt-6">
              <h3 className="mb-6 font-['Open_Sans'] text-lg font-semibold text-foreground">
                Nội dung tin tuyển dụng
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Tên công việc <span className="text-destructive">*</span>
                  </Label>
                  <input type="text" value={jobData.title} onChange={e => handleInputChange('title', e.target.value)} placeholder="Chức danh tuyển dụng" className={HR_INPUT_PILL} />
                </div>

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Loại công việc <span className="text-destructive">*</span>
                  </Label>
                  <select value={jobData.jobType} onChange={e => handleInputChange('jobType', e.target.value)} className={HR_INPUT_PILL}>
                    <option value="">Chọn loại công việc</option>
                    {jobTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Địa điểm làm việc
                  </Label>
                  <div className="space-y-3">
                    <div className="flex space-x-4">
                      {['onsite', 'remote', 'hybrid'].map(type => <label key={type} className="flex cursor-pointer items-center">
                          <input type="radio" name="locationType" value={type} checked={jobData.locationType === type} onChange={e => handleInputChange('locationType', e.target.value)} className="relative mr-2 h-4 w-4 appearance-none rounded-full border-2 border-primary focus:ring-2 focus:ring-ring/40 focus:ring-offset-0" style={{
                        backgroundImage: jobData.locationType === type ? 'radial-gradient(circle, var(--primary) 30%, transparent 30%)' : 'none'
                      }} />
                          <span className="font-['Roboto'] text-sm text-foreground">{type === 'onsite' ? 'Onsite' : type === 'remote' ? 'Remote' : 'Hybrid'}</span>
                        </label>)}
                    </div>
                    {jobData.locationType !== 'remote' && <input type="text" value={jobData.location} onChange={e => handleInputChange('location', e.target.value)} placeholder="Địa điểm làm việc" className={HR_INPUT_PILL} />}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Mức lương (không bắt buộc)
                  </Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="mb-1 block font-['Roboto'] text-xs text-muted-foreground">
                        Mức tối thiểu
                      </Label>
                      <input type="number" name="salaryRange.min" value={jobData.salaryRange.min} onChange={handleInputChange} placeholder="5000000" step="1000" className={HR_INPUT_PILL} />
                    </div>
                    <div>
                      <Label className="mb-1 block font-['Roboto'] text-xs text-muted-foreground">
                        Mức tối đa
                      </Label>
                      <input type="number" name="salaryRange.max" value={jobData.salaryRange.max} onChange={handleInputChange} placeholder="10000000" step="1000" className={HR_INPUT_PILL} />
                    </div>
                    <div>
                      <Label className="mb-1 block font-['Roboto'] text-xs text-muted-foreground">Tiền tệ</Label>
                      <select name="salaryRange.currency" value={jobData.salaryRange.currency} onChange={handleInputChange} className={HR_INPUT_PILL}>
                        <option value="VND">VNĐ</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div>
                      <Label className="mb-1 block font-['Roboto'] text-xs text-muted-foreground">Chu kỳ</Label>
                      <select name="salaryRange.period" value={jobData.salaryRange.period} onChange={handleInputChange} className={HR_INPUT_PILL}>
                        <option value="year">Mỗi năm</option>
                        <option value="month">Mỗi tháng</option>
                        <option value="hour">Mỗi giờ</option>
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 font-['Roboto'] text-xs text-muted-foreground">
                    Nhập số tiền lương trực tiếp bằng VNĐ hoặc USD. Việc cung cấp thông tin lương giúp thu hút ứng viên phù hợp.
                  </p>
                </div>

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Mô tả công việc <span className="text-destructive">*</span>
                  </Label>
                  <textarea value={jobData.description} onChange={e => handleInputChange('description', e.target.value)} placeholder="Mô tả vai trò, trách nhiệm và công việc cần thực hiện" rows={6} className={HR_TEXTAREA_PILL} />
                </div>

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Yêu cầu ứng viên
                  </Label>
                  <textarea value={jobData.requirements || ''} onChange={e => handleInputChange('requirements', e.target.value)} placeholder="Yêu cầu kinh nghiệm, kỹ năng chuyên môn..." rows={6} className={HR_TEXTAREA_PILL} />
                </div>

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Quyền lợi ứng viên
                  </Label>
                  <textarea value={jobData.benefits || ''} onChange={e => handleInputChange('benefits', e.target.value)} placeholder="Mô tả chế độ đãi ngộ, lương thưởng, bảo hiểm..." rows={6} className={HR_TEXTAREA_PILL} />
                </div>
              </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm overflow-visible">
              <CardContent className="pt-6">
              <h3 className="mb-6 flex items-center font-['Open_Sans'] text-lg font-semibold text-foreground">
                <svg className="mr-2 size-5 stroke-current" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                Tiêu chí ứng tuyển
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block font-['Roboto'] text-foreground">
                      Bằng cấp/Yêu cầu bắt buộc <span className="text-destructive">*</span>
                    </Label>
                    {(jobData.qualification.length > 0 || jobData.customQualifications.length > 0) && <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {jobData.qualification.map(qual => <Badge key={qual} variant="outline" className="h-auto gap-0.5 rounded-full border-primary/30 bg-primary/10 py-1 pl-2 pr-0.5 text-xs font-normal text-primary">
                              {qual}
                              <Button type="button" variant="ghost" size="icon" className="size-5 shrink-0 text-primary hover:bg-primary/20" onClick={() => toggleQualification(qual)} aria-label="Xóa">
                                <X className="size-3" />
                              </Button>
                            </Badge>)}
                          {jobData.customQualifications.map(qual => <Badge key={qual} variant="secondary" className="h-auto gap-0.5 rounded-full py-1 pl-2 pr-0.5 text-xs font-normal">
                              {qual}
                              <Button type="button" variant="ghost" size="icon" className="size-5 shrink-0 hover:bg-muted" onClick={() => removeCustomQualification(qual)} aria-label="Xóa">
                                <X className="size-3" />
                              </Button>
                            </Badge>)}
                
                
                 </div>
                      </div>}
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
                      <div className="grid grid-cols-1 gap-2">
                        {qualifications.map(qual => <label key={qual} className="flex cursor-pointer items-center">
                            <input type="checkbox" checked={jobData.qualification.includes(qual)} onChange={() => toggleQualification(qual)} className="size-4 rounded border-border bg-background text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                            <span className="ml-2 font-['Roboto'] text-sm text-foreground">{qual}</span>
                          </label>)}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex gap-2">
                        <input type="text" placeholder="Yêu cầu bổ sung" value={customQualificationInput} onChange={e => setCustomQualificationInput(e.target.value)} className={`flex-1 ${HR_INPUT_PILL}`} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCustomQualification())} />
                        <Button type="button" variant="outline" size="sm" className="shrink-0 font-['Roboto']" onClick={addCustomQualification}>
                          Thêm
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block font-['Roboto'] text-foreground">
                      Cấp bậc kinh nghiệm <span className="text-destructive">*</span>
                    </Label>
                    <select value={jobData.experienceLevel} onChange={e => handleInputChange('experienceLevel', e.target.value)} className={HR_INPUT_PILL}>
                      <option value="">Chọn kinh nghiệm</option>
                      {experienceLevels.map(exp => <option key={exp} value={exp}>{exp}</option>)}
                    </select>
                  </div>
                </div>


              </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm overflow-visible">
              <CardContent className="pt-6">
              <h3 className="mb-6 flex items-center font-['Open_Sans'] text-lg font-semibold text-foreground">
                <svg className="mr-2 size-5 stroke-current" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
                </svg>
                Cài đặt ứng tuyển
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block font-['Roboto'] text-foreground">
                      Hạn nộp hồ sơ <span className="text-destructive">*</span>
                    </Label>
                    <DateTimePicker
                      value={jobData.applicationDeadline}
                      onChange={val => handleInputChange('applicationDeadline', val)}
                      placeholder="Chọn ngày và giờ hạn nộp..."
                      minDate={new Date().toISOString()}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block font-['Roboto'] text-foreground">
                      Số ứng viên tối đa (không bắt buộc)
                    </Label>
                    <input type="number" value={jobData.maxApplicants} onChange={e => handleInputChange('maxApplicants', e.target.value)} placeholder="Không bắt buộc" min="1" className={HR_INPUT_PILL} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-['Roboto'] text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Tóm tắt:</span>{' '}
                    Bật lọc, đặt ngưỡng %, chọn kiểu chấm điểm, tùy chọn miễn lọc khi có thư giới thiệu.
                  </p>
                  <div className="flex items-center justify-between border-b border-border py-2">
                    <div>
                      <h4 className="font-['Open_Sans'] text-sm font-medium text-foreground">
                        Bật sàng lọc tự động
                      </h4>
                      <p className="font-['Roboto'] text-xs text-muted-foreground">
                        Hồ sơ dưới ngưỡng bị từ chối; hồ sơ đạt ngưỡng gửi thông báo cho bộ phận tuyển dụng.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={jobData.atsEnabled} onChange={e => handleInputChange('atsEnabled', e.target.checked)} className="peer sr-only" />
                      <div className={HR_TOGGLE_TRACK} />
                    </label>
                  </div>
                  {jobData.atsEnabled && <div>
                      <Label className="mb-2 block font-['Roboto'] text-foreground">
                        Ngưỡng điểm hồ sơ tối thiểu (%)
                      </Label>
                      <input type="number" min="0" max="100" step="1" value={jobData.atsResumeThreshold} onChange={e => handleInputChange('atsResumeThreshold', e.target.value)} placeholder="Ngưỡng điểm tối thiểu" className={HR_INPUT_PILL} />
                      <p className="mt-1 font-['Roboto'] text-xs text-muted-foreground">
                        Điểm thấp hơn ngưỡng thì hồ sơ chuyển sang từ chối tự động.
                      </p>
                      <div className="mt-4 space-y-2">
                        <p className="font-['Open_Sans'] text-sm font-medium text-foreground">Kiểu chấm điểm</p>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/50">
                          <input type="radio" name="atsEngine" checked={jobData.atsEngine === 'gemini'} onChange={() => handleInputChange('atsEngine', 'gemini')} className="text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                          <span className="font-['Roboto'] text-sm font-medium text-foreground">Bản version 1</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/50">
                          <input type="radio" name="atsEngine" checked={jobData.atsEngine === 'scan_cv'} onChange={() => handleInputChange('atsEngine', 'scan_cv')} className="text-primary accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                          <span className="font-['Roboto'] text-sm font-medium text-foreground">Bản version 2</span>
                        </label>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border py-3">
                        <div>
                          <h4 className="font-['Open_Sans'] text-sm font-medium text-foreground">
                            Không áp ngưỡng khi có thư giới thiệu
                          </h4>
                          <p className="font-['Roboto'] text-xs text-muted-foreground">
                            Khi bật: có thư giới thiệu thì không tự động từ chối vì điểm sàng lọc.
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input type="checkbox" checked={jobData.atsSkipWhenCoverLetter} onChange={e => handleInputChange('atsSkipWhenCoverLetter', e.target.checked)} className="peer sr-only" />
                          <div className={HR_TOGGLE_TRACK} />
                        </label>
                      </div>
                    </div>}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="font-['Open_Sans'] text-sm font-medium text-foreground">
                        Yêu cầu hồ sơ xin việc
                      </h4>
                      <p className="font-['Roboto'] text-xs text-muted-foreground">
                        Bắt buộc ứng viên đính kèm hồ sơ
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={jobData.resumeRequired} onChange={e => handleInputChange('resumeRequired', e.target.checked)} className="peer sr-only" />
                      <div className={HR_TOGGLE_TRACK} />
                    </label>
                  </div>
                </div>
              </div>
              </CardContent>
            </Card>
          </fieldset>

          <div className="lg:col-span-1">
            <Card className="shadow-sm overflow-visible">
              <CardContent className="pt-6">
                <h3 className="mb-4 font-['Open_Sans'] text-lg font-semibold text-foreground">Thao tác đăng tin</h3>
                <div className="space-y-3">
                  <Button type="button" variant="outline" className="w-full font-['Roboto']" disabled={isSubmitting} onClick={() => handleSubmit('draft')}>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu bản nháp'}
                  </Button>
                  <Button type="button" className="w-full font-['Roboto']" disabled={!isFormValid() || isSubmitting} onClick={() => handleSubmit('active')}>
                    {isSubmitting ? 'Đang đăng...' : 'Đăng tin ngay'}
                  </Button>
                </div>

                {!isFormValid() && (
                  <p className="mt-2 font-['Roboto'] text-xs text-destructive">
                    Vui lòng điền đầy đủ các trường bắt buộc để có thể đăng tin ngay
                  </p>
                )}

                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 font-['Roboto'] text-sm text-muted-foreground">
                    Có thể lưu bản nháp và hoàn tất đăng tin sau từ mục tin tuyển dụng.
                  </p>
                  <div className="flex items-center font-['Roboto'] text-xs text-muted-foreground">
                    <svg className="mr-1 size-4 stroke-current" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tin bản nháp có thể chỉnh sửa và đăng từ danh sách tin tuyển dụng
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RecruiterLayout>;
};
export default RecruiterCreateJob;




