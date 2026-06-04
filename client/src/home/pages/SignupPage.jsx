import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/api';
import { CAREER_FIELD_OPTIONS, getSuggestedSkillsByCareerField } from '../../utils/careerSkillSuggestions';
const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    careerField: '',
    currentLocation: '',
    educationEntries: [{
      id: 1,
      qualification: '',
      fieldOfStudy: '',
      universityName: '',
      graduationYear: '',
      cgpaPercentage: ''
    }],
    currentStatus: '',
    primarySkills: [],
    workExperienceEntries: [{
      id: 1,
      yearsOfExperience: '',
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      isCurrentlyWorking: false,
      description: ''
    }]
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      let elementId = firstErrorKey;
      if (firstErrorKey.startsWith('education_')) {
        const parts = firstErrorKey.split('_');
        if (parts.length === 3) {
          elementId = `${parts[2]}_${parts[1]}`;
        }
      }
      if (firstErrorKey.startsWith('work_')) {
        const parts = firstErrorKey.split('_');
        if (parts.length >= 3) {
          elementId = `${parts[2]}_${parts[1]}`;
        }
      }
      let element = document.getElementById(elementId) || document.querySelector(`[name="${elementId}"]`);
      if (!element) {
        element = document.getElementById(firstErrorKey) || document.querySelector(`[name="${firstErrorKey}"]`);
      }
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        element.focus();
      }
    }
  }, [errors]);
  const qualificationOptions = ['Trung học phổ thông', 'Cao đẳng/Chứng chỉ', 'Cử nhân', 'Thạc sĩ', 'Tiến sĩ', 'Khác'];
  const experienceOptions = ['Mới ra trường', '0-1 năm', '1-3 năm', '3-5 năm', '5-7 năm', '7-10 năm', 'Trên 10 năm'];
  const currentStatusOptions = ['Mới ra trường', 'Sinh viên', 'Đang đi làm'];
  const suggestedSkills = getSuggestedSkillsByCareerField(formData.careerField);
  const currentYear = new Date().getFullYear();
  const graduationYears = [];
  for (let year = currentYear; year >= 1980; year--) {
    graduationYears.push(year);
  }
  const handleInputChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  const addEducationEntry = () => {
    const newId = Math.max(...formData.educationEntries.map(entry => entry.id)) + 1;
    setFormData(prev => ({
      ...prev,
      educationEntries: [...prev.educationEntries, {
        id: newId,
        qualification: '',
        fieldOfStudy: '',
        universityName: '',
        graduationYear: '',
        cgpaPercentage: ''
      }]
    }));
  };
  const removeEducationEntry = id => {
    if (formData.educationEntries.length > 1) {
      setFormData(prev => ({
        ...prev,
        educationEntries: prev.educationEntries.filter(entry => entry.id !== id)
      }));
      setErrors(prev => {
        const newErrors = {
          ...prev
        };
        delete newErrors[`education_${id}_qualification`];
        delete newErrors[`education_${id}_fieldOfStudy`];
        delete newErrors[`education_${id}_universityName`];
        delete newErrors[`education_${id}_graduationYear`];
        return newErrors;
      });
    }
  };
  const handleEducationChange = (id, field, value) => {
    if (field === 'cgpaPercentage' && value) {
      const numericValue = value.replace(/[^0-9.]/g, '');
      const parts = numericValue.split('.');
      if (parts.length > 2) {
        return;
      }
      const gpa = parseFloat(numericValue);
      if (!Number.isNaN(gpa) && gpa > 4) {
        setErrors(prev => ({
          ...prev,
          [`education_${id}_cgpaPercentage`]: 'GPA phải nhỏ hơn hoặc bằng 4.0'
        }));
        return;
      }
      value = numericValue;
    }
    setFormData(prev => ({
      ...prev,
      educationEntries: prev.educationEntries.map(entry => entry.id === id ? {
        ...entry,
        [field]: value
      } : entry)
    }));
    const errorKey = `education_${id}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };
  const addSkill = skill => {
    if (skill && !formData.primarySkills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        primarySkills: [...prev.primarySkills, skill]
      }));
    }
  };
  const removeSkill = skillToRemove => {
    setFormData(prev => ({
      ...prev,
      primarySkills: prev.primarySkills.filter(skill => skill !== skillToRemove)
    }));
  };
  const addWorkExperience = () => {
    const newId = Math.max(...formData.workExperienceEntries.map(entry => entry.id)) + 1;
    setFormData(prev => ({
      ...prev,
      workExperienceEntries: [...prev.workExperienceEntries, {
        id: newId,
        yearsOfExperience: '',
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        isCurrentlyWorking: false,
        description: ''
      }]
    }));
  };
  const removeWorkExperience = id => {
    if (formData.workExperienceEntries.length > 1) {
      setFormData(prev => ({
        ...prev,
        workExperienceEntries: prev.workExperienceEntries.filter(entry => entry.id !== id)
      }));
    }
  };
  const handleWorkExperienceChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      workExperienceEntries: prev.workExperienceEntries.map(entry => entry.id === id ? {
        ...entry,
        [field]: value,
        ...(field === 'isCurrentlyWorking' && value ? {
          endDate: ''
        } : {})
      } : entry)
    }));
    const errorKey = `work_${id}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Họ và tên là bắt buộc';
    if (!formData.email.trim()) newErrors.email = 'Email là bắt buộc';
    if (!formData.password.trim()) newErrors.password = 'Mật khẩu là bắt buộc';
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu của bạn';
    if (!formData.currentLocation.trim()) newErrors.currentLocation = 'Nơi ở hiện tại là bắt buộc';
    if (!formData.currentStatus) newErrors.currentStatus = 'Trạng thái hiện tại là bắt buộc';
    if (!formData.careerField) newErrors.careerField = 'Vui lòng chọn lĩnh vực/ngành nghề';
    if (!formData.primarySkills || formData.primarySkills.length === 0) newErrors.primarySkills = 'Cần ít nhất một kỹ năng';
    if (!formData.educationEntries || formData.educationEntries.length === 0) {
      newErrors.education = 'Cần ít nhất một mục học vấn';
    } else {
      formData.educationEntries.forEach(education => {
        if (!education.qualification) {
          newErrors[`education_${education.id}_qualification`] = 'Bằng cấp là bắt buộc';
        }
        if (!education.fieldOfStudy.trim()) {
          newErrors[`education_${education.id}_fieldOfStudy`] = 'Ngành học là bắt buộc';
        }
        if (!education.universityName.trim()) {
          newErrors[`education_${education.id}_universityName`] = 'Tên trường là bắt buộc';
        }
        if (!education.graduationYear) {
          newErrors[`education_${education.id}_graduationYear`] = 'Năm tốt nghiệp là bắt buộc';
        }
        if (education.cgpaPercentage) {
          const gpa = parseFloat(education.cgpaPercentage);
          if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) {
            newErrors[`education_${education.id}_cgpaPercentage`] = 'GPA phải trong khoảng 0 đến 4.0';
          }
        }
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ';
    }
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
    }
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('fullName', formData.fullName.trim());
      formDataToSubmit.append('email', formData.email.trim().toLowerCase());
      formDataToSubmit.append('password', formData.password);
      formDataToSubmit.append('phone', formData.phone.trim());
      formDataToSubmit.append('currentLocation', formData.currentLocation.trim());
      formDataToSubmit.append('currentStatus', formData.currentStatus);
      formDataToSubmit.append('careerField', formData.careerField);
      const educationData = formData.educationEntries.map(entry => ({
        qualification: entry.qualification,
        fieldOfStudy: entry.fieldOfStudy.trim(),
        universityName: entry.universityName.trim(),
        graduationYear: entry.graduationYear,
        cgpaPercentage: entry.cgpaPercentage.trim()
      }));
      formDataToSubmit.append('educationEntries', JSON.stringify(educationData));
      const workData = formData.workExperienceEntries.map(entry => ({
        yearsOfExperience: entry.yearsOfExperience,
        company: entry.company.trim(),
        position: entry.position.trim(),
        startDate: entry.startDate,
        endDate: entry.endDate,
        isCurrentlyWorking: entry.isCurrentlyWorking,
        description: entry.description.trim()
      }));
      formDataToSubmit.append('workExperienceEntries', JSON.stringify(workData));
      formDataToSubmit.append('primarySkills', JSON.stringify(formData.primarySkills));
      const response = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        body: formDataToSubmit
      });
      const data = await response.json();
      console.log('Server response:', data);
      if (data.success) {
        navigate('/verify-email', {
          state: {
            email: formData.email
          }
        });
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          const newErrors = {};
          data.errors.forEach(error => {
            newErrors[error.field] = error.message;
          });
          setErrors(newErrors);
        } else if (data.field) {
          setErrors({
            [data.field]: data.message
          });
        } else {
          setErrors({
            submit: data.message || 'Đăng ký không thành công. Vui lòng thử lại.'
          });
        }
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setErrors({
        submit: 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <main className="flex w-full flex-col md:flex-row overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300 mt-16 min-h-[calc(100svh-4rem)] md:h-[calc(100svh-4rem)] md:min-h-0">
      <div className="relative flex w-full flex-col items-center justify-center bg-[#EE0000] p-10 md:w-1/2 overflow-hidden md:h-full md:flex-shrink-0">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src="/slider1.webp" alt="" aria-hidden="true" className="h-full w-full object-cover opacity-35 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#ee0000]/90 via-[#ee0000]/85 to-[#b80000]/90" />
        </div>
        <div className="absolute -bottom-10 -left-8 w-56 h-56 rounded-full overflow-hidden opacity-20 pointer-events-none">
          <img src="/slider2.webp" alt="" aria-hidden="true" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -top-10 -right-8 w-56 h-56 rounded-full overflow-hidden opacity-20 pointer-events-none">
          <img src="/slider3.webp" alt="" aria-hidden="true" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 text-center text-white space-y-8 max-w-lg">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider leading-tight">
              CÙNG FINDME
            </h1>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider leading-tight">
              KIẾN TẠO TƯƠNG LAI
            </h1>
          </div>
          <p className="text-sm md:text-base leading-relaxed font-medium opacity-90">
            Ba điều <span className="font-bold">FINDME</span> chắc chắn sẽ cho bạn: cơ hội không ngừng sáng tạo, thách thức để khẳng định bản thân, và điều kiện để học hỏi, phát triển.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center p-8 md:w-1/2 md:p-10 overflow-y-auto md:h-full">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-[#EE0000] tracking-tighter">FINDME</span>
              <span className="text-xl font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest pt-1">TUYỂN DỤNG</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">TẠO TÀI KHOẢN</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Hoàn tất thông tin để bắt đầu hành trình cùng FINDME.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8" aria-busy={isSubmitting}>
          <fieldset disabled={isSubmitting} className="min-w-0 border-0 p-0 m-0 space-y-8 disabled:opacity-[0.85]">
          {}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white transition-colors duration-300 border-b border-gray-200 pb-2">
              Thông tin tài khoản
            </h2>
            
            {}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input id="fullName" name="fullName" type="text" required value={formData.fullName} onChange={handleInputChange} placeholder="Nhập họ và tên của bạn" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            {}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Địa chỉ email <span className="text-red-500">*</span>
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange} placeholder="Nhập địa chỉ email của bạn" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={formData.password} onChange={handleInputChange} placeholder="Tạo một mật khẩu mạnh" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors pr-12 dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.05 8.05m1.828 1.828l-.94.94M6.221 6.22l12.574 12.574" />}
                  </svg>
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              <p className="mt-1 text-sm text-gray-500 font-['Roboto']">
                Mật khẩu phải có ít nhất 8 ký tự
              </p>
            </div>

            {}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={formData.confirmPassword} onChange={handleInputChange} placeholder="Nhập lại mật khẩu của bạn" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            {}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Số điện thoại <span className="text-gray-400">(Không bắt buộc)</span>
              </label>
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={formData.phone} onChange={handleInputChange} placeholder="VD: 0901234567" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
            </div>
          </div>

          {}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white transition-colors duration-300 border-b border-gray-200 pb-2">
              Thông tin hồ sơ
            </h2>
            
            {}
            <div>
              <label htmlFor="currentLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Nơi ở hiện tại / Thành phố <span className="text-red-500">*</span>
              </label>
              <input id="currentLocation" name="currentLocation" type="text" required value={formData.currentLocation} onChange={handleInputChange} placeholder="VD: Quận 1, TP. Hồ Chí Minh" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
              {errors.currentLocation && <p className="mt-1 text-sm text-red-600">{errors.currentLocation}</p>}
            </div>

            {}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white transition-colors duration-300 border-b border-gray-200 pb-2 flex-1 mr-4">
                  Thông tin học vấn
                </h3>
                <button type="button" onClick={addEducationEntry} className="bg-[#EE0000] text-white hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium font-['Open_Sans'] transition-colors flex items-center gap-2 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Thêm học vấn
                </button>
              </div>
              
              {formData.educationEntries.map((education, index) => <div key={education.id} className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 font-['Open_Sans']">
                      Học vấn {index + 1}
                    </h4>
                    {formData.educationEntries.length > 1 && <button type="button" onClick={() => removeEducationEntry(education.id)} className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50 transition-colors dark:hover:bg-red-900 dark:hover:text-red-300" title="Xóa mục học vấn này">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>}
                  </div>

                  {}
                  <div>
                      <label htmlFor={`qualification_${education.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                      Bằng cấp <span className="text-red-500">*</span>
                    </label>
                      <select id={`qualification_${education.id}`} name={`qualification_${education.id}`} required value={education.qualification} onChange={e => handleEducationChange(education.id, 'qualification', e.target.value)} className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-300 dark:focus:border-gray-300">
                      <option value="">Chọn bằng cấp</option>
                      {qualificationOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                    {errors[`education_${education.id}_qualification`] && <p className="mt-1 text-sm text-red-600">{errors[`education_${education.id}_qualification`]}</p>}
                  </div>

                  {}
                  <div>
                    <label htmlFor={`fieldOfStudy_${education.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                      Ngành học / Chuyên ngành <span className="text-red-500">*</span>
                    </label>
                    <input id={`fieldOfStudy_${education.id}`} name={`fieldOfStudy_${education.id}`} type="text" required value={education.fieldOfStudy} onChange={e => handleEducationChange(education.id, 'fieldOfStudy', e.target.value)} placeholder="VD: Công nghệ thông tin, Kế toán, Marketing" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                    {errors[`education_${education.id}_fieldOfStudy`] && <p className="mt-1 text-sm text-red-600">{errors[`education_${education.id}_fieldOfStudy`]}</p>}
                  </div>

                  {}
                  <div>
                    <label htmlFor={`universityName_${education.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                      Tên trường đại học / cao đẳng <span className="text-red-500">*</span>
                    </label>
                    <input id={`universityName_${education.id}`} name={`universityName_${education.id}`} type="text" required value={education.universityName} onChange={e => handleEducationChange(education.id, 'universityName', e.target.value)} placeholder="VD: Đại học Bách Khoa TP.HCM, Đại học Quốc gia Hà Nội" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                    {errors[`education_${education.id}_universityName`] && <p className="mt-1 text-sm text-red-600">{errors[`education_${education.id}_universityName`]}</p>}
                  </div>

                  {}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {}
                    <div>
                      <label htmlFor={`graduationYear_${education.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                        Năm tốt nghiệp <span className="text-red-500">*</span>
                      </label>
                      <select id={`graduationYear_${education.id}`} name={`graduationYear_${education.id}`} required value={education.graduationYear} onChange={e => handleEducationChange(education.id, 'graduationYear', e.target.value)} className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-300 dark:focus:border-gray-300">
                        <option value="">Chọn năm</option>
                        {graduationYears.map(year => <option key={year} value={year}>{year}</option>)}
                      </select>
                      {errors[`education_${education.id}_graduationYear`] && <p className="mt-1 text-sm text-red-600">{errors[`education_${education.id}_graduationYear`]}</p>}
                    </div>

                    {}
                    <div>
                      <label htmlFor={`cgpaPercentage_${education.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-1">
                        GPA
                      </label>
                      <input id={`cgpaPercentage_${education.id}`} name={`cgpaPercentage_${education.id}`} type="text" inputMode="decimal" value={education.cgpaPercentage} onChange={e => handleEducationChange(education.id, 'cgpaPercentage', e.target.value)} placeholder="Ví dụ: 3.6 / 4.0" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                      <p className="mt-1 text-xs text-gray-500 font-['Roboto']">Nhập GPA của bạn</p>
                      {errors[`education_${education.id}_cgpaPercentage`] && <p className="mt-1 text-sm text-red-600">{errors[`education_${education.id}_cgpaPercentage`]}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 font-['Roboto']">
                        Thêm nhiều bằng cấp nếu bạn có bằng từ các trường khác nhau hoặc nhiều trình độ học vấn.
                      </p>
                </div>)}
              
              
            </div>

            {}
            <div>
              <label htmlFor="currentStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Trạng thái hiện tại <span className="text-red-500">*</span>
              </label>
              <select id="currentStatus" name="currentStatus" required value={formData.currentStatus} onChange={handleInputChange} className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-300 dark:focus:border-gray-300">
                <option value="">Chọn trạng thái</option>
                {currentStatusOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
              {errors.currentStatus && <p className="mt-1 text-sm text-red-600">{errors.currentStatus}</p>}
            </div>

            {}
            <div>
              <label htmlFor="careerField" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Lĩnh vực / Ngành nghề <span className="text-red-500">*</span>
              </label>
              <select
                id="careerField"
                name="careerField"
                required
                value={formData.careerField}
                onChange={handleInputChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-300 dark:focus:border-gray-300"
              >
                <option value="">Chọn lĩnh vực</option>
                {CAREER_FIELD_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.careerField && <p className="mt-1 text-sm text-red-600">{errors.careerField}</p>}
              <p className="mt-1 text-xs text-gray-500 font-['Roboto']">Dùng để gợi ý kỹ năng phù hợp và phân loại hồ sơ đúng ngành.</p>
            </div>

            {}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Kỹ năng chính <span className="text-red-500">*</span>
              </label>
              
              {}
              {formData.primarySkills.length > 0 && <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 min-h-[60px] dark:border-gray-700 dark:bg-gray-800">
                  {formData.primarySkills.map((skill, index) => <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-sm rounded-full font-['Roboto'] dark:bg-white dark:text-black">
                      {skill}
                      <button type="button" onClick={() => removeSkill(skill)} className="ml-1 text-gray-300 hover:text-white transition-colors dark:text-gray-400 dark:hover:text-gray-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>)}
                </div>}
              
              {}
              <div className="flex gap-2">
                <input type="text" placeholder="Nhập một kỹ năng và nhấn Enter" className="flex-1 px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" onKeyPress={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const skill = e.target.value.trim();
                  if (skill) {
                    addSkill(skill);
                    e.target.value = '';
                  }
                }
              }} />
                <button type="button" onClick={e => {
                const input = e.target.parentElement.querySelector('input');
                const skill = input.value.trim();
                if (skill) {
                  addSkill(skill);
                  input.value = '';
                }
              }} className="px-4 py-3 bg-[#EE0000] text-white rounded-lg hover:bg-red-700 transition-colors font-['Open_Sans'] text-sm">
                  Thêm
                </button>
              </div>
              
              {}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-['Open_Sans'] mb-2">Kỹ năng phổ biến (nhấn để thêm):</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {suggestedSkills.filter(skill => !formData.primarySkills.includes(skill)).slice(0, 30).map(skill => <button key={skill} type="button" onClick={() => addSkill(skill)} className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-100 hover:border-gray-400 transition-colors font-['Roboto'] text-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:border-gray-500">
                      + {skill}
                    </button>)}
                </div>
              </div>
              
              {errors.primarySkills && <p className="mt-1 text-sm text-red-600">{errors.primarySkills}</p>}
              <p className="text-sm text-gray-500 font-['Roboto']">
                Thêm các kỹ năng thể hiện rõ nhất chuyên môn của bạn. Bạn có thể nhập kỹ năng riêng hoặc chọn từ danh sách gợi ý.
              </p>
            </div>

            {}
            {formData.currentStatus === 'Đang đi làm' && <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white transition-colors duration-300 border-b border-gray-200 pb-2 flex-1 mr-4">
                    Chi tiết kinh nghiệm làm việc <span className="text-gray-400 text-sm font-normal">(Không bắt buộc)</span>
                  </h3>
                  <button type="button" onClick={addWorkExperience} className="bg-[#EE0000] text-white hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium font-['Open_Sans'] transition-colors flex items-center gap-2 shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm kinh nghiệm
                  </button>
                </div>
                
                {formData.workExperienceEntries.map((experience, index) => <div key={experience.id} className="space-y-4 p-6 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 font-['Open_Sans']">
                        Kinh nghiệm {index + 1}
                      </h4>
                      {formData.workExperienceEntries.length > 1 && <button type="button" onClick={() => removeWorkExperience(experience.id)} className="text-red-600 hover:text-red-800 p-1 rounded-lg hover:bg-red-50 transition-colors dark:hover:bg-red-900 dark:hover:text-red-300" title="Xóa kinh nghiệm này">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>}
                    </div>

                    {}
                    <div>
                      <label htmlFor={`yearsOfExperience_${experience.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                        Số năm kinh nghiệm cho vị trí này
                      </label>
                      <select id={`yearsOfExperience_${experience.id}`} value={experience.yearsOfExperience} onChange={e => handleWorkExperienceChange(experience.id, 'yearsOfExperience', e.target.value)} className="block w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-gray-300 dark:focus:border-gray-300">
                        <option value="">Chọn số năm kinh nghiệm</option>
                        {experienceOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>

                    {}
                    <div>
                      <label htmlFor={`company_${experience.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                        Tên công ty
                      </label>
                      <input id={`company_${experience.id}`} type="text" value={experience.company} onChange={e => handleWorkExperienceChange(experience.id, 'company', e.target.value)} placeholder="VD: FPT, VNG, Viettel, MoMo" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                    </div>

                    {}
                    <div>
                      <label htmlFor={`position_${experience.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                        Vị trí / Vai trò
                      </label>
                      <input id={`position_${experience.id}`} type="text" value={experience.position} onChange={e => handleWorkExperienceChange(experience.id, 'position', e.target.value)} placeholder="ví dụ: Kỹ sư phần mềm, Chuyên viên phân tích dữ liệu, Quản lý dự án" className="block w-full px-4 py-3 border border-gray-200 rounded-full placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                    </div>

                    {}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {}
                      <div>
                    <label htmlFor={`startDate_${experience.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                          Ngày bắt đầu
                        </label>
                        <input id={`startDate_${experience.id}`} type="month" value={experience.startDate} onChange={e => handleWorkExperienceChange(experience.id, 'startDate', e.target.value)} className="block w-full px-4 py-3 border border-gray-200 rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                      </div>

                      {}
                      <div>
                        <label htmlFor={`endDate_${experience.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                          Ngày kết thúc
                        </label>
                        <div className="space-y-2">
                          <input id={`endDate_${experience.id}`} type="month" value={experience.endDate} onChange={e => handleWorkExperienceChange(experience.id, 'endDate', e.target.value)} disabled={experience.isCurrentlyWorking} className="block w-full px-4 py-3 border border-gray-200 rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EE0000] font-['Roboto'] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:disabled:bg-gray-700 dark:focus:ring-red-900 dark:focus:border-[#EE0000]" />
                          <label className="flex items-center text-sm text-gray-600 font-['Roboto']">
                            <input type="checkbox" checked={experience.isCurrentlyWorking} onChange={e => handleWorkExperienceChange(experience.id, 'isCurrentlyWorking', e.target.checked)} className="mr-2 rounded border-gray-300 text-black focus:ring-black dark:border-gray-600 dark:text-white dark:focus:ring-gray-300" />
                            Tôi hiện đang làm việc tại đây
                          </label>
                        </div>
                      </div>
                    </div>

                    {}
                    <div>
                      <label htmlFor={`description_${experience.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                        Mô tả công việc / Trách nhiệm
                      </label>
                      <textarea id={`description_${experience.id}`} rows="3" value={experience.description} onChange={e => handleWorkExperienceChange(experience.id, 'description', e.target.value)} placeholder="Mô tả ngắn gọn trách nhiệm chính và thành tựu của bạn..." className="block w-full px-4 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-black font-['Roboto'] transition-colors resize-vertical dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-gray-300 dark:focus:border-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-['Roboto']">
                   Việc thêm chi tiết kinh nghiệm làm việc giúp nhà tuyển dụng hiểu rõ hơn về nền tảng của bạn và cải thiện khả năng phù hợp công việc. Bạn có thể thêm nhiều vai trò nếu đã làm ở nhiều công ty khác nhau.
                    </p>
                  </div>)}
                
                
              </div>}
          </div>

          

          {}
          <div className="pt-6">
            {}
            {errors.submit && <div className="mb-2 text-center p-2 dark:text-red-300">
                <p className="text-sm text-red-600 font-['Roboto']">{errors.submit}</p>
              </div>}
            
            <button type="submit" disabled={isSubmitting} className="w-full bg-[#EE0000] text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed py-3 px-4 rounded-lg text-lg font-semibold font-['Open_Sans'] transition-colors flex items-center justify-center gap-2">
              {isSubmitting ? <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang tạo tài khoản...
                </> : 'Tạo tài khoản'}
            </button>
          </div>

          {}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-['Roboto']">
              Đã có tài khoản?{' '}
              <Link to="/login" tabIndex={isSubmitting ? -1 : undefined} className={`text-[#EE0000] hover:underline font-semibold transition-colors ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}>
                Đăng nhập
              </Link>
            </p>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  </main>;
};
export default SignupPage;