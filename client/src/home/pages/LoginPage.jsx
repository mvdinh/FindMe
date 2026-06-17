import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Lock, Eye, EyeOff, UserCircle } from "lucide-react";
const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const from = location.state?.from?.pathname || "/jobs";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(formData.email, formData.password);
      if (user.role === "recruiter") {
        logout();
        setError(
          "Tài khoản của bạn là nhà tuyển dụng. Vui lòng đăng nhập tại trang dành cho nhà tuyển dụng.",
        );
        return;
      }
      switch (user.role) {
        case "admin":
          navigate("/admin/companies");
          break;
        case "applicant":
          navigate(from, { replace: true });
          break;
        default:
          navigate(from, { replace: true });
      }
    } catch (error) {
      if (error.code === "EMAIL_VERIFICATION_REQUIRED" && error.email) {
        navigate("/verify-email", {
          state: {
            email: error.email,
          },
        });
        return;
      }
      setError(error.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="flex min-h-screen w-full flex-col md:flex-row overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="relative flex w-full flex-col items-center justify-center bg-[#EE0000] p-10 md:w-1/2 overflow-hidden">
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
            Với <span className="font-bold">FINDME</span>, bạn sẽ dễ dàng tiếp
            cận hàng ngàn cơ hội việc làm hấp dẫn, kết nối trực tiếp với các nhà
            tuyển dụng hàng đầu và tạo bước đệm vững chắc để phát triển sự
            nghiệp.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center p-8 md:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-[#EE0000] tracking-tighter">
                FINDME
              </span>
              <span className="text-xl font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest pt-1">
                TUYỂN DỤNG
              </span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
              CHÀO MỪNG
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Hãy đăng nhập để trải nghiệm cùng chúng tôi.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            aria-busy={loading}
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <UserCircle className="w-5 h-5 text-gray-300 dark:text-gray-500" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email"
                disabled={loading}
                className="w-full py-3 pl-12 pr-4 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Lock className="w-5 h-5 text-gray-300 dark:text-gray-500" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Mật khẩu"
                disabled={loading}
                className="w-full py-3 pl-12 pr-12 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950 focus:border-[#EE0000] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" />
                )}
              </button>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-center text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-sm tracking-widest transition-all shadow-lg active:scale-[0.98] ${loading ? "bg-red-300 text-red-50 cursor-not-allowed" : "bg-[#EE0000] text-white hover:bg-red-700"}`}
            >
              {loading ? "ĐANG ĐĂNG NHẬP..." : "ĐĂNG NHẬP"}
            </button>

            <div className="text-center text-xs text-gray-500 dark:text-gray-400 space-y-2.5 mt-4">
              <div>
                <Link
                  to="/forgot-password"
                  tabIndex={loading ? -1 : undefined}
                  className={`hover:text-[#EE0000] transition-colors hover:underline ${loading ? "pointer-events-none opacity-50" : ""}`}
                >
                  Bạn quên mật khẩu?
                </Link>
              </div>
              <div>
                Chưa có tài khoản ứng viên?{" "}
                <Link
                  to="/signup"
                  tabIndex={loading ? -1 : undefined}
                  className="font-bold text-[#EE0000] dark:text-red-400 hover:underline"
                >
                  Đăng ký ngay
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};
export default LoginPage;
