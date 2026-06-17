import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/api';
const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorKey = Object.keys(errors)[0];
      let element = document.getElementById(firstErrorKey) || document.querySelector(`[name="${firstErrorKey}"]`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        element.focus();
      }
    }
  }, [errors]);
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
  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Họ và tên là bắt buộc';
    if (!formData.email.trim()) newErrors.email = 'Email là bắt buộc';
    if (!formData.password.trim()) newErrors.password = 'Mật khẩu là bắt buộc';
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu của bạn';

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
  return <main className="flex w-full flex-col md:flex-row overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300 min-h-screen md:h-screen md:min-h-0">
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
            Với <span className="font-bold">FINDME</span>, bạn sẽ dễ dàng tiếp cận hàng ngàn cơ hội việc làm hấp dẫn, kết nối trực tiếp với các nhà tuyển dụng hàng đầu và tạo bước đệm vững chắc để phát triển sự nghiệp.
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
              <input id="fullName" name="fullName" type="text" required value={formData.fullName} onChange={handleInputChange} placeholder="Nhập họ và tên của bạn" className="block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/80 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] font-['Roboto'] transition-colors" />
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            {}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Địa chỉ email <span className="text-red-500">*</span>
              </label>
              <input id="email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleInputChange} placeholder="Nhập địa chỉ email của bạn" className="block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/80 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] font-['Roboto'] transition-colors" />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-['Open_Sans'] mb-2">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={formData.password} onChange={handleInputChange} placeholder="Tạo một mật khẩu mạnh" className="block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/80 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] font-['Roboto'] transition-colors pr-12" />
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
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required value={formData.confirmPassword} onChange={handleInputChange} placeholder="Nhập lại mật khẩu của bạn" className="block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/80 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] font-['Roboto'] transition-colors" />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

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