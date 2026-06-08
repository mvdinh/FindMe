import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiRequest } from '../../hooks/useApiRequest';
import { useToast } from '../../contexts/ToastContext';
import HRLayout from '../layout/HRLayout';
import { HR_PAGE, HR_H1, HR_SUBTITLE } from '../hrLayoutClasses';
import { HR_INPUT_PILL, HR_TEXTAREA_PILL, HR_TOGGLE_TRACK } from '../hrFormClasses';
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
};

const HRCreateJob = () => {
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
  const seedSampleJob = () => {
    const deadline = getSampleDeadline();
    setJobData({
      title: 'Lập trình viên Frontend cấp cao',
      description: 'findme đang tìm Lập trình viên Frontend cấp cao để xây dựng và duy trì giao diện web chất lượng cao bằng React, TypeScript và các công cụ hiện đại. Vị trí phối hợp chặt chẽ với nhóm Thiết kế và Backend nhằm đảm bảo trải nghiệm ứng viên và nhà tuyển dụng nhất quán, chuyên nghiệp.',
      requirements: '- Tối thiểu 3 năm kinh nghiệm phát triển với React, TypeScript và các công nghệ Frontend hiện đại.\n- Thành thạo HTML5, CSS3, Tailwind CSS và thiết kế Responsive.\n- Có tư duy thiết kế tốt, hiểu biết về UX/UI và tối ưu hóa hiệu năng render trang web.',
      benefits: '- Thu nhập cạnh tranh từ 20,000,000 đến 30,000,000 VNĐ tùy năng lực.\n- Được hưởng đầy đủ chế độ BHXH, BHYT, bảo hiểm sức khỏe cao cấp FindMe Care.\n- Lương tháng 13 và các khoản thưởng hiệu quả dự án hấp dẫn.',
      department: 'Kỹ thuật',
      customDepartment: '',
      jobType: 'Toàn thời gian',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      locationType: 'onsite',
      qualification: ['Cử nhân Khoa học máy tính'],
      customQualifications: [],
      experienceLevel: '3-5 năm',
      requiredSkills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'REST API'],
      preferredSkills: ['Tailwind CSS', 'Redux Toolkit', 'Testing Library'],
      salaryRange: {
        min: '20000000',
        max: '30000000',
        currency: 'VND',
        period: 'year',
        format: 'absolute'
      },
      applicationDeadline: deadline,
      maxApplicants: '',
      atsEnabled: false,
      atsEngine: 'gemini',
      atsResumeThreshold: 60,
      atsSkipWhenCoverLetter: false,
      resumeRequired: true,
      defaultInterviewRounds: ['Sơ loại qua điện thoại', 'Phỏng vấn kỹ thuật', 'Phỏng vấn nhân sự'],
      defaultInterviewer: '',
      status: 'active'
    });
  };
  const seedBlockchainJob = () => {
    const deadline = getSampleDeadline();
    setJobData({
      title: 'Kỹ sư Blockchain',
      description: 'findme đang tìm Kỹ sư Blockchain để thiết kế, phát triển và tối ưu smart contract cùng các dịch vụ backend tích hợp Web3. Vị trí làm việc cùng nhóm sản phẩm để triển khai các tính năng on-chain an toàn và hiệu năng cao.',
      requirements: '- Tối thiểu 2 năm kinh nghiệm thiết kế và phát triển Smart Contract trên Ethereum/EVM sử dụng Solidity.\n- Hiểu rõ về kiến trúc EVM, chuẩn token ERC-20, ERC-721, ERC-1155 và các kỹ thuật tối ưu chi phí gas.\n- Sử dụng thành thạo Hardhat, Foundry hoặc Truffle cho việc viết test và deploy.',
      benefits: '- Thu nhập hấp dẫn từ 30,000,000 đến 50,000,000 VNĐ.\n- Cấp thiết bị làm việc Macbook Pro cao cấp.\n- Cơ hội nhận token/equity thưởng hấp dẫn theo tiến độ dự án.',
      department: 'Kỹ thuật',
      customDepartment: '',
      jobType: 'Toàn thời gian',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      locationType: 'hybrid',
      qualification: ['Cử nhân Khoa học máy tính'],
      customQualifications: [],
      experienceLevel: '3-5 năm',
      requiredSkills: ['Solidity', 'EVM', 'Smart Contract', 'Node.js', 'Web3.js', 'Security Audit'],
      preferredSkills: ['Hardhat', 'Foundry', 'Rust', 'Docker'],
      salaryRange: {
        min: '30000000',
        max: '50000000',
        currency: 'VND',
        period: 'year',
        format: 'absolute'
      },
      applicationDeadline: deadline,
      maxApplicants: '',
      atsEnabled: true,
      atsResumeThreshold: 65,
      atsSkipWhenCoverLetter: true,
      resumeRequired: true,
      defaultInterviewRounds: ['Sơ loại qua điện thoại', 'Phỏng vấn kỹ thuật', 'Đánh giá mã nguồn', 'Phỏng vấn nhân sự'],
      defaultInterviewer: '',
      status: 'active'
    });
  };
  const seedJavaBackendJob = () => {
    const deadline = getSampleDeadline();
    setJobData({
      title: 'Lập trình viên Java Backend',
      description: 'findme cần Lập trình viên Java Backend để xây dựng hệ thống microservices, tối ưu API và đảm bảo độ ổn định cho nền tảng. Vị trí phối hợp với Frontend, DevOps và QA trong toàn bộ vòng đời phát triển sản phẩm.',
      requirements: '- Tối thiểu 1-2 năm kinh nghiệm lập trình backend với Java và Spring Boot framework.\n- Có kiến thức tốt về cơ sở dữ liệu quan hệ (MySQL, PostgreSQL) và cơ chế caching (Redis).\n- Hiểu biết cơ bản về Docker, RESTful API và cách triển khai CI/CD cơ bản.',
      benefits: '- Mức lương thưởng hấp dẫn lên tới 32,000,000 VNĐ.\n- Thưởng dự án tháng, quý và xét tăng lương định kỳ 1 lần/năm.\n- Môi trường làm việc thoải mái, nhiều cơ hội học hỏi từ các chuyên gia.',
      department: 'Kỹ thuật',
      customDepartment: '',
      jobType: 'Toàn thời gian',
      location: 'Hà Nội, Việt Nam',
      locationType: 'onsite',
      qualification: ['Cử nhân Khoa học máy tính'],
      customQualifications: [],
      experienceLevel: '1-2 năm',
      requiredSkills: ['Java', 'Spring Boot', 'REST API', 'MySQL', 'Redis', 'Docker'],
      preferredSkills: ['Kafka', 'Kubernetes', 'AWS', 'CI/CD'],
      salaryRange: {
        min: '18000000',
        max: '32000000',
        currency: 'VND',
        period: 'year',
        format: 'absolute'
      },
      applicationDeadline: deadline,
      maxApplicants: '',
      atsEnabled: true,
      atsEngine: 'gemini',
      atsResumeThreshold: 60,
      atsSkipWhenCoverLetter: true,
      resumeRequired: true,
      defaultInterviewRounds: ['Sơ loại qua điện thoại', 'Phỏng vấn kỹ thuật', 'Phỏng vấn nhân sự'],
      defaultInterviewer: '',
      status: 'active'
    });
  };
  const departments = ['Kỹ thuật', 'Marketing', 'Nhân sự', 'Kinh doanh', 'Sản phẩm', 'Thiết kế', 'Tài chính', 'Vận hành', 'Chăm sóc khách hàng', 'Khoa học dữ liệu', 'Đảm bảo chất lượng', 'An ninh', 'Pháp lý', 'Hành chính', 'Khác'];
  const jobTypes = ['Toàn thời gian', 'Bán thời gian', 'Thực tập', 'Hợp đồng', 'Tự do', 'Thời vụ'];
  const qualifications = ['Trung học phổ thông', 'Trung cấp/Cao đẳng', 'Cử nhân Kỹ thuật', 'Cử nhân Khoa học máy tính', 'Cử nhân Kinh doanh', 'Cử nhân Thương mại', 'Cử nhân Nghệ thuật', 'Cử nhân Khoa học', 'Thạc sĩ Kỹ thuật', 'Thạc sĩ Khoa học máy tính', 'Thạc sĩ Quản trị Kinh doanh (MBA)', 'Thạc sĩ Thương mại', 'Thạc sĩ Nghệ thuật', 'Thạc sĩ Khoa học', 'Tiến sĩ', 'Chứng chỉ nghề nghiệp', 'Chứng chỉ kỹ thuật'];
  const experienceLevels = ['Mới tốt nghiệp (0 năm)', '1-2 năm', '3-5 năm', '5-8 năm', '8-12 năm', 'Trên 12 năm'];
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
      if (!jobData.department && !jobData.customDepartment.trim()) {
        toast.warning('Vui lòng chọn phòng ban');
        return;
      }
      if (jobData.department === 'Khác' && !jobData.customDepartment.trim()) {
        toast.warning('Vui lòng nhập phòng ban khi chọn "Khác"');
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
        department: jobData.department === 'Khác' ? jobData.customDepartment.trim() : jobData.department,
        jobType: jobData.jobType,
        location: jobData.location,
        locationType: jobData.locationType,
        salaryRange: {
          min: processSalaryValue(jobData.salaryRange.min),
          max: processSalaryValue(jobData.salaryRange.max),
          currency: jobData.salaryRange.currency,
          period: jobData.salaryRange.period,
          format: 'absolute'
        },
        qualification: [...jobData.qualification, ...jobData.customQualifications],
        experienceLevel: jobData.experienceLevel,
        requiredSkills: jobData.requiredSkills,
        preferredSkills: jobData.preferredSkills,
        applicationDeadline: jobData.applicationDeadline,
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
      const response = await makeJsonRequest('/api/hr/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      if (response.success) {
        toast.success(`Tin tuyển dụng đã ${status === 'draft' ? 'được lưu bản nháp' : 'được đăng'} thành công!`);
        navigate('/hr/jobs', {
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
      const errMsg = String(error?.message || '');
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
    return jobData.title.trim() && jobData.description.trim() && jobData.department && jobData.jobType && jobData.qualification && jobData.experienceLevel && jobData.applicationDeadline;
  };
  return <HRLayout>
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
              variant={activeTemplate === 'frontend' ? 'default' : 'outline'}
              className={`font-['Roboto'] ${activeTemplate === 'frontend' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => {
                if (activeTemplate === 'frontend') {
                  setActiveTemplate(null);
                  setJobData(INITIAL_JOB_STATE);
                } else {
                  setActiveTemplate('frontend');
                  seedSampleJob();
                }
              }}
              disabled={formBusy}
            >
              Mẫu Frontend
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTemplate === 'blockchain' ? 'default' : 'outline'}
              className={`font-['Roboto'] ${activeTemplate === 'blockchain' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => {
                if (activeTemplate === 'blockchain') {
                  setActiveTemplate(null);
                  setJobData(INITIAL_JOB_STATE);
                } else {
                  setActiveTemplate('blockchain');
                  seedBlockchainJob();
                }
              }}
              disabled={formBusy}
            >
              Mẫu Blockchain
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTemplate === 'java' ? 'default' : 'outline'}
              className={`font-['Roboto'] ${activeTemplate === 'java' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => {
                if (activeTemplate === 'java') {
                  setActiveTemplate(null);
                  setJobData(INITIAL_JOB_STATE);
                } else {
                  setActiveTemplate('java');
                  seedJavaBackendJob();
                }
              }}
              disabled={formBusy}
            >
              Mẫu Java Backend
            </Button>
            <Button type="button" variant="outline" className="font-['Roboto']" onClick={() => navigate('/hr/jobs')} disabled={formBusy}>
              <ArrowLeft className="mr-2 size-4" />
              Quay lại danh sách tin
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <fieldset disabled={formBusy} className="lg:col-span-2 space-y-6 min-w-0 border-0 p-0 m-0 disabled:opacity-[0.9]">
            <Card className="shadow-sm">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block font-['Roboto'] text-foreground">
                      Phòng ban <span className="text-destructive">*</span>
                    </Label>
                    <select value={jobData.department} onChange={e => handleInputChange('department', e.target.value)} className={HR_INPUT_PILL}>
                      <option value="">Chọn phòng ban</option>
                      {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      <option value="Khác">Khác</option>
                    </select>
                    
                    {jobData.department === 'Khác' && <input type="text" placeholder="Nhập phòng ban" value={jobData.customDepartment} onChange={e => handleInputChange('customDepartment', e.target.value)} className={`${HR_INPUT_PILL} mt-2`} />}
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
                          <span className="font-['Roboto'] text-sm text-foreground">{type === 'onsite' ? 'Tại văn phòng' : type === 'remote' ? 'Từ xa' : 'Kết hợp'}</span>
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

            <Card className="shadow-sm">
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

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Kỹ năng bắt buộc
                  </Label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {jobData.requiredSkills.map((skill, index) => <Badge key={index} variant="outline" className="h-auto gap-0.5 rounded-full border-primary/30 bg-primary/10 py-1 pl-2.5 pr-0.5 text-sm font-normal text-primary">
                        {skill}
                        <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 text-primary hover:bg-primary/20" onClick={() => handleSkillRemove('required', index)} aria-label="Xóa kỹ năng">
                          <X className="size-3.5" />
                        </Button>
                      </Badge>)}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd('required'))} placeholder="Kỹ năng bắt buộc" className={`flex-1 ${HR_INPUT_PILL}`} />
                    <Button type="button" variant="outline" className="shrink-0 rounded-full font-['Roboto']" onClick={() => handleSkillAdd('required')}>
                      Thêm
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block font-['Roboto'] text-foreground">
                    Kỹ năng ưu tiên (không bắt buộc)
                  </Label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {jobData.preferredSkills.map((skill, index) => <Badge key={index} variant="secondary" className="h-auto gap-0.5 rounded-full py-1 pl-2.5 pr-0.5 text-sm font-normal">
                        {skill}
                        <Button type="button" variant="ghost" size="icon" className="size-6 shrink-0 hover:bg-muted" onClick={() => handleSkillRemove('preferred', index)} aria-label="Xóa kỹ năng">
                          <X className="size-3.5" />
                        </Button>
                      </Badge>)}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={preferredSkillInput} onChange={e => setPreferredSkillInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleSkillAdd('preferred'))} placeholder="Kỹ năng ưu tiên" className={`flex-1 ${HR_INPUT_PILL}`} />
                    <Button type="button" variant="outline" className="shrink-0 rounded-full font-['Roboto']" onClick={() => handleSkillAdd('preferred')}>
                      Thêm
                    </Button>
                  </div>
                </div>
              </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
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
            <Card className="shadow-sm">
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
    </HRLayout>;
};
export default HRCreateJob;




