import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { buildApiUrl } from "../../utils/api";
import {
  Lock,
  Eye,
  EyeOff,
  UserCircle,
  Building2,
  Briefcase,
  Phone,
  User,
  ChevronDown,
  Check,
  Info,
} from "lucide-react";

const RecruiterAuthPage = () => {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("login"); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Accordion for "Quy định" (Rules)
  const [rulesExpanded, setRulesExpanded] = useState(true);

  // Agreement Checkboxes
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePromotions, setAgreePromotions] = useState(false);

  // Form states
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    fullName: "",
    gender: "male",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    companyName: "",
    companyAddress: "",
    jobTitle: "",
  });

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      setError("Vui lòng điền đầy đủ thông tin đăng nhập");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(loginData.email, loginData.password);
      if (user.role !== "recruiter" && user.role !== "admin") {
        logout();
        setError(
          "Tài khoản của bạn là ứng viên. Vui lòng đăng nhập tại trang dành cho ứng viên.",
        );
        return;
      }
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/recruiter/dashboard");
      }
    } catch (err) {
      if (err.code === "EMAIL_VERIFICATION_REQUIRED" && err.email) {
        navigate("/verify-email", { state: { email: err.email } });
        return;
      }
      setError(err.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const validateSignup = () => {
    if (!agreeTerms)
      return "Bạn phải đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của FINDME";
    if (!signupData.email.trim()) return "Email đăng nhập là bắt buộc";
    if (!signupData.password) return "Mật khẩu là bắt buộc";
    if (signupData.password.length < 8)
      return "Mật khẩu phải có ít nhất 8 ký tự";
    if (signupData.password !== signupData.confirmPassword)
      return "Mật khẩu xác nhận không khớp";
    if (!signupData.fullName.trim()) return "Họ và tên là bắt buộc";
    if (!signupData.phone.trim()) return "Số điện thoại cá nhân là bắt buộc";
    if (!signupData.companyName.trim()) return "Tên công ty là bắt buộc";
    if (!signupData.jobTitle.trim()) return "Chức danh tuyển dụng là bắt buộc";
    if (!signupData.companyAddress.trim()) return "Địa chỉ công ty là bắt buộc";
    return null;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateSignup();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append("fullName", signupData.fullName.trim());
      formDataToSubmit.append("email", signupData.email.trim().toLowerCase());
      formDataToSubmit.append("password", signupData.password);
      formDataToSubmit.append("phone", signupData.phone.trim());
      formDataToSubmit.append("role", "recruiter");
      formDataToSubmit.append("companyName", signupData.companyName.trim());
      formDataToSubmit.append(
        "companyAddress",
        signupData.companyAddress.trim(),
      );
      formDataToSubmit.append("jobTitle", signupData.jobTitle.trim());

      const response = await fetch(buildApiUrl("/api/auth/register"), {
        method: "POST",
        body: formDataToSubmit,
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMsg(
          "Đăng ký thành công! Đang chuyển hướng xác thực email...",
        );
        setTimeout(() => {
          navigate("/verify-email", { state: { email: signupData.email, redirectTo: "/tuyen-dung" } });
        }, 1500);
      } else {
        setError(data.message || "Đăng ký thất bại. Vui lòng thử lại.");
      }
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* CSS custom styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(0.5deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      {/* Left side form scrollable */}
      <div className="flex-1 overflow-y-auto px-6 md:px-12 lg:px-20 py-10 h-full scrollbar-thin">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Logo brand */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FINDME Logo" className="h-10 w-auto" />
            <span className="text-2xl font-black text-[#EE0000] tracking-tighter">
              FINDME
            </span>
          </div>

          {/* Heading dynamic */}
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black text-[#EE0000] dark:text-red-500 tracking-tight">
              {activeTab === "login"
                ? "Chào mừng bạn đã quay trở lại"
                : "Đăng ký tài khoản Nhà tuyển dụng"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm leading-relaxed">
              Cùng tạo dựng lợi thế cho doanh nghiệp bằng trải nghiệm công nghệ
              tuyển dụng ứng dụng sâu AI & Hiring Funnel
            </p>
          </div>

          {/* Quy định Alert (only in signup mode) */}
          {activeTab === "signup" && (
            <div className="border border-red-200 dark:border-red-900/40 rounded-xl bg-red-50/30 dark:bg-red-950/10 overflow-hidden transition-all duration-300">
              <button
                type="button"
                onClick={() => setRulesExpanded(!rulesExpanded)}
                className="w-full flex items-center justify-between p-4 font-bold text-sm text-[#EE0000] dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#EE0000] dark:bg-red-500 animate-pulse"></span>
                  Quy định đăng ký tài khoản
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${rulesExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {rulesExpanded && (
                <div className="px-4 pb-4 text-xs text-gray-600 dark:text-gray-400 space-y-2.5 border-t border-red-100 dark:border-red-950/20 pt-3 leading-relaxed">
                  <p>
                    • Để đảm bảo chất lượng dịch vụ, <strong>FINDME</strong>{" "}
                    không cho phép một người dùng tạo nhiều tài khoản khác nhau.
                  </p>
                  <p>
                    • Nếu phát hiện vi phạm, hệ thống sẽ tạm ngưng dịch vụ đối
                    với các tài khoản trùng lặp hoặc giới hạn quyền truy cập.
                  </p>
                  <p>
                    • Sau khi hoàn tất đăng ký tài khoản tuyển dụng (NTD) và
                    cung cấp đầy đủ thông tin, NTD có thể được hỗ trợ hiển thị
                    các tin tuyển dụng cơ bản và sử dụng công cụ AI phân tích
                    ứng viên.
                  </p>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mt-1 flex items-center gap-1">
                    📞 Hotline hỗ trợ:{" "}
                    <span className="text-[#EE0000] dark:text-red-400 font-bold">
                      1900 6888
                    </span>{" "}
                    (Hỗ trợ 24/7)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error and success message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-center text-sm font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 text-green-600 dark:text-green-400 p-3.5 rounded-xl text-center text-sm font-medium">
              {successMsg}
            </div>
          )}

          {/* Login tab content */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Email đăng nhập
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <UserCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={loginData.email}
                      onChange={handleLoginChange}
                      placeholder="Nhập email tuyển dụng"
                      disabled={loading}
                      className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginData.password}
                      onChange={handleLoginChange}
                      placeholder="Nhập mật khẩu"
                      disabled={loading}
                      className="w-full py-3 pl-12 pr-12 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <div className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-[#EE0000] dark:text-red-400 hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#EE0000] hover:bg-red-700 text-white font-bold text-sm tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg uppercase"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                Chưa có tài khoản tuyển dụng?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("signup");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="font-bold text-[#EE0000] dark:text-red-400 hover:underline"
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          )}

          {/* Signup tab content */}
          {activeTab === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-8">
              {/* SECTION: TÀI KHOẢN */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-1">
                  <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    1. Tài khoản
                  </h3>
                </div>

                {/* Email đăng nhập */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Email đăng nhập *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <UserCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={signupData.email}
                      onChange={handleSignupChange}
                      placeholder="Nhập email đăng ký"
                      disabled={loading}
                      className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                    />
                  </div>
                </div>

                {/* Mật khẩu và Xác nhận mật khẩu */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Mật khẩu *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={signupData.password}
                        onChange={handleSignupChange}
                        placeholder="Mật khẩu"
                        disabled={loading}
                        className="w-full py-3 pl-12 pr-12 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Nhập lại mật khẩu *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={signupData.confirmPassword}
                        onChange={handleSignupChange}
                        placeholder="Nhập lại mật khẩu"
                        disabled={loading}
                        className="w-full py-3 pl-12 pr-12 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-4"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: THÔNG TIN NHÀ TUYỂN DỤNG */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-1">
                  <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    2. Thông tin nhà tuyển dụng
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Họ và tên */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Họ và tên *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        name="fullName"
                        type="text"
                        required
                        value={signupData.fullName}
                        onChange={handleSignupChange}
                        placeholder="Nhập họ tên đầy đủ"
                        disabled={loading}
                        className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                      />
                    </div>
                  </div>

                  {/* Giới tính */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Giới tính *
                    </label>
                    <div className="flex h-11 items-center gap-4 px-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          checked={signupData.gender === "male"}
                          onChange={handleSignupChange}
                          className="text-[#EE0000] focus:ring-[#EE0000]"
                        />
                        <span>Nam</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          checked={signupData.gender === "female"}
                          onChange={handleSignupChange}
                          className="text-[#EE0000] focus:ring-[#EE0000]"
                        />
                        <span>Nữ</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Số điện thoại cá nhân */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Số điện thoại cá nhân *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        name="phone"
                        type="tel"
                        required
                        value={signupData.phone}
                        onChange={handleSignupChange}
                        placeholder="Số điện thoại"
                        disabled={loading}
                        className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                      />
                    </div>
                  </div>

                  {/* Chức danh tuyển dụng */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Chức danh tuyển dụng *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Briefcase className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        name="jobTitle"
                        type="text"
                        required
                        value={signupData.jobTitle}
                        onChange={handleSignupChange}
                        placeholder="VD: HR Manager"
                        disabled={loading}
                        className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: THÔNG TIN CÔNG TY */}
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-1">
                  <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    3. Thông tin doanh nghiệp
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tên công ty */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Tên doanh nghiệp *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        name="companyName"
                        type="text"
                        required
                        value={signupData.companyName}
                        onChange={handleSignupChange}
                        placeholder="Tên đầy đủ của công ty"
                        disabled={loading}
                        className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                      />
                    </div>
                  </div>

                  {/* Địa chỉ công ty */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Địa chỉ công ty *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        name="companyAddress"
                        type="text"
                        required
                        value={signupData.companyAddress}
                        onChange={handleSignupChange}
                        placeholder="Trụ sở/Địa chỉ công ty"
                        disabled={loading}
                        className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TERMS & AGREEMENT CHECKBOXES */}
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
                <p className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                  Điều khoản dịch vụ
                </p>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded text-[#EE0000] focus:ring-[#EE0000] border-gray-300 dark:border-gray-700"
                  />
                  <span>
                    Tôi đã đọc và đồng ý với{" "}
                    <Link
                      to="/terms"
                      className="text-[#EE0000] dark:text-red-400 font-bold hover:underline"
                    >
                      Điều khoản dịch vụ
                    </Link>{" "}
                    và{" "}
                    <Link
                      to="/privacy"
                      className="text-[#EE0000] dark:text-red-400 font-bold hover:underline"
                    >
                      Chính sách bảo mật
                    </Link>{" "}
                    của FINDME.{" "}
                    <span className="text-red-500 font-bold">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreePromotions}
                    onChange={(e) => setAgreePromotions(e.target.checked)}
                    className="mt-0.5 rounded text-[#EE0000] focus:ring-[#EE0000] border-gray-300 dark:border-gray-700"
                  />
                  <span>
                    Tôi đồng ý nhận thông tin tư vấn và các giải pháp tối ưu tin
                    tuyển dụng hiệu quả từ FINDME.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#EE0000] hover:bg-red-700 text-white font-bold text-sm tracking-widest rounded-xl transition-all shadow-md hover:shadow-lg uppercase"
              >
                {loading ? "Đang xử lý..." : "Đăng ký tài khoản"}
              </button>

              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                Đã có tài khoản tuyển dụng?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="font-bold text-[#EE0000] dark:text-red-400 hover:underline"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </form>
          )}

          {/* Copyright Info */}
          <div className="pt-4 text-center border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            © 2014-{new Date().getFullYear()} FINDME Vietnam JSC. All rights
            reserved.
          </div>
        </div>
      </div>

      {/* Right side banner sticky on desktop */}
      <div className="hidden lg:flex w-[40%] relative bg-[#EE0000] text-white p-12 flex-col justify-between overflow-hidden h-full">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/slider1.webp"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-35 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#ee0000]/90 via-[#ee0000]/85 to-[#b80000]/90" />
        </div>
        <div className="absolute -bottom-10 -left-8 w-56 h-56 rounded-full overflow-hidden opacity-20 pointer-events-none">
          <img
            src="/slider2.webp"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -top-10 -right-8 w-56 h-56 rounded-full overflow-hidden opacity-20 pointer-events-none">
          <img
            src="/slider3.webp"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Header Tabs inside banner area */}
        <div className="relative z-10 flex justify-end gap-2">
          <button
            onClick={() => {
              setActiveTab("login");
              setError("");
              setSuccessMsg("");
            }}
            className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === "login"
                ? "bg-white text-[#EE0000] shadow-lg"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => {
              setActiveTab("signup");
              setError("");
              setSuccessMsg("");
            }}
            className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all uppercase ${
              activeTab === "signup"
                ? "bg-white text-[#EE0000] shadow-lg"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            Đăng ký mới
          </button>
        </div>

        {/* Dynamic illustration & heading */}
        <div className="relative z-10 text-center my-auto space-y-8 max-w-sm mx-auto">
          <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase tracking-wider leading-tight">
              {activeTab === "login" ? (
                <>
                  TÌM KIẾM NHÂN TÀI <br />
                  <span className="text-yellow-300">
                    BẰNG CÔNG NGHỆ AI
                  </span>
                </>
              ) : (
                <>
                  QUẢN TRỊ TOÀN DIỆN <br />
                  <span className="text-yellow-300">VỚI HỆ THỐNG ATS</span>
                </>
              )}
            </h2>
            <p className="text-sm text-white/90 leading-relaxed font-medium">
              {activeTab === "login"
                ? "Giải pháp AI thông minh giúp doanh nghiệp tự động sàng lọc, đánh giá và kết nối chính xác với những ứng viên tiềm năng nhất."
                : "Số hóa toàn bộ quy trình tuyển dụng. Đo lường hiệu quả và tối ưu hóa chi phí với hệ thống báo cáo dữ liệu chuyên sâu."}
            </p>
          </div>
        </div>

        {/* Bottom Slogan logo */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5 mt-auto">
          <span className="text-xs tracking-widest font-bold text-white/90 uppercase">
            Tiếp lợi thế, nối thành công
          </span>
        </div>
      </div>
    </main>
  );
};

export default RecruiterAuthPage;
