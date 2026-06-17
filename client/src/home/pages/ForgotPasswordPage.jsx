import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { buildApiUrl } from '../../utils/api';
const pad = n => n.toString().padStart(2, '0');
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [codeVerified, setCodeVerified] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [lastAutoVerifiedCode, setLastAutoVerifiedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const codeString = useMemo(() => code.join(''), [code]);
  useEffect(() => {
    let t;
    if (cooldown > 0) {
      t = setInterval(() => setCooldown(s => s > 0 ? s - 1 : 0), 1000);
    }
    return () => clearInterval(t);
  }, [cooldown]);
  useEffect(() => {
    if (step !== 2) return;
    if (verifying || sending) return;
    if (codeString.length !== 6) return;
    if (!/^\d{6}$/.test(codeString)) return;
    if (lastAutoVerifiedCode === codeString) return;
    setLastAutoVerifiedCode(codeString);
    verifyCode();
  }, [codeString, step]);
  const handleEmailSubmit = async e => {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập email của bạn');
      return;
    }
    setSending(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(buildApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Gửi mã đặt lại thất bại');
        return;
      }
      setMessage('Mã đặt lại mật khẩu đã gửi đến email của bạn');
      if (data.data?.resendCooldownSec) setCooldown(data.data.resendCooldownSec);
      setStep(2);
      setCodeVerified(false);
      setResetToken('');
      setCode(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError('Lỗi mạng khi gửi mã đặt lại');
    } finally {
      setSending(false);
    }
  };
  const resendCode = async () => {
    setSending(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(buildApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Gửi lại mã thất bại');
        return;
      }
      setMessage('Đã gửi lại mã đặt lại mật khẩu');
      if (data.data?.resendCooldownSec) setCooldown(data.data.resendCooldownSec);
      setCodeVerified(false);
      setResetToken('');
      setCode(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError('Lỗi mạng khi gửi lại mã');
    } finally {
      setSending(false);
    }
  };
  const handleCodeChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    setError('');
    setMessage('');
    if (val && idx < 5) {
      const el = document.getElementById(`reset-otp-${idx + 1}`);
      if (el) el.focus();
    }
  };
  const handleCodePaste = (idx, e) => {
    const text = e.clipboardData?.getData('text') ?? '';
    const digits = String(text).replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = [...code];
    let writeAt = idx;
    for (const ch of digits) {
      if (writeAt > 5) break;
      next[writeAt] = ch;
      writeAt += 1;
    }
    setCode(next);
    setError('');
    setMessage('');
    const focusIdx = Math.min(writeAt, 5);
    const el = document.getElementById(`reset-otp-${focusIdx}`);
    if (el) el.focus();
  };
  const handleCodeKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      e.preventDefault();
      const prev = [...code];
      prev[idx - 1] = '';
      setCode(prev);
      const el = document.getElementById(`reset-otp-${idx - 1}`);
      if (el) el.focus();
    }
  };
  const verifyCode = async () => {
    if (codeString.length !== 6) {
      setError('Vui lòng nhập mã 6 chữ số');
      return;
    }
    setVerifying(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(buildApiUrl('/api/auth/verify-reset-code'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          code: codeString
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Mã xác minh không hợp lệ');
        return;
      }
      setResetToken(data.data?.resetToken || '');
      setCodeVerified(true);
      setMessage('Xác minh mã thành công. Vui lòng nhập mật khẩu mới.');
      setStep(3);
      setCode(['', '', '', '', '', '']);
    } catch (e) {
      setError('Lỗi mạng khi xác minh mã');
    } finally {
      setVerifying(false);
    }
  };
  const handleVerifyCode = async e => {
    e.preventDefault();
    await verifyCode();
  };
  const handleResetSubmit = async e => {
    e.preventDefault();
    if (!codeVerified || !resetToken) {
      setError('Vui lòng xác minh mã trước khi đặt lại mật khẩu');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }
    setResetting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(buildApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          resetToken,
          newPassword
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Đặt lại mật khẩu thất bại');
        return;
      }
      setMessage('Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (e) {
      setError('Lỗi mạng khi đặt lại mật khẩu');
    } finally {
      setResetting(false);
    }
  };
  const mmss = useMemo(() => `${pad(Math.floor(cooldown / 60))}:${pad(cooldown % 60)}`, [cooldown]);
  const step2Busy = sending || verifying;
  return <main className="flex min-h-screen w-full flex-col md:flex-row overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300 pt-16">
      <div className="relative flex w-full flex-col items-center justify-center bg-[#EE0000] p-10 md:w-1/2 overflow-hidden">
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

      <div className="flex w-full flex-col items-center justify-center p-8 md:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-[#EE0000] tracking-tighter">FINDME</span>
              <span className="text-xl font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest pt-1">TUYỂN DỤNG</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">{step === 1 ? 'QUÊN MẬT KHẨU' : step === 2 ? 'XÁC MINH MÃ' : 'ĐẶT LẠI MẬT KHẨU'}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {step === 1 ? 'Nhập email để nhận mã đặt lại mật khẩu.' : step === 2 ? `Nhập mã đã gửi đến ${email}` : 'Nhập mật khẩu mới cho tài khoản của bạn.'}
            </p>
          </div>

          {step === 1 && <form onSubmit={handleEmailSubmit} className="space-y-5" aria-busy={sending}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-['Open_Sans']">
                Địa chỉ email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={sending} className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 focus:border-[#EE0000] transition-all disabled:opacity-60 disabled:cursor-not-allowed" placeholder="ban@example.com" required />
            </div>

            {message && <p className="text-green-600 text-sm text-center font-['Roboto']">{message}</p>}
            {error && <p className="text-red-600 text-sm text-center font-['Roboto']">{error}</p>}

            <button type="submit" disabled={sending} className="w-full py-3 bg-[#EE0000] text-white rounded-md font-bold text-sm tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50">
              {sending ? 'Đang gửi...' : 'Gửi mã đặt lại'}
            </button>

            <div className="text-center">
              <Link to="/login" tabIndex={sending ? -1 : undefined} className={`text-sm text-gray-600 dark:text-gray-400 hover:text-[#EE0000] font-['Roboto'] ${sending ? 'pointer-events-none opacity-50' : ''}`}>
                Quay lại đăng nhập
              </Link>
            </div>
          </form>}

          {step === 2 && <div className="space-y-5" aria-busy={step2Busy}>
            <form onSubmit={handleVerifyCode} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-['Open_Sans']">
                Mã xác minh
              </label>
              <div className="flex justify-center space-x-2">
                {code.map((v, i) => <input key={i} id={`reset-otp-${i}`} inputMode="numeric" maxLength={1} value={v} disabled={step2Busy} onChange={e => handleCodeChange(i, e.target.value)} onKeyDown={e => handleCodeKeyDown(i, e)} onPaste={e => handleCodePaste(i, e)} className="w-12 h-12 text-center text-xl rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 focus:border-[#EE0000] disabled:opacity-60 disabled:cursor-not-allowed" />)}
              </div>
            </div>

            {message && <p className="text-green-600 text-sm text-center font-['Roboto']">{message}</p>}
            {error && <p className="text-red-600 text-sm text-center font-['Roboto']">{error}</p>}

            <button type="submit" disabled={step2Busy || codeString.length !== 6} className="w-full py-3 bg-[#EE0000] text-white rounded-md font-bold text-sm tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {verifying ? 'Đang xác minh...' : sending ? 'Đang gửi mã...' : 'Xác minh mã'}
            </button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-300 font-['Roboto']">
              Chưa nhận được mã?{' '}
              <button type="button" disabled={cooldown > 0 || step2Busy} onClick={resendCode} className="underline hover:text-[#EE0000] disabled:no-underline disabled:opacity-50">
                {cooldown > 0 ? `Gửi lại sau ${mmss}` : 'Gửi lại mã'}
              </button>
            </div>

            <div className="text-center">
              <button type="button" disabled={step2Busy} onClick={() => setStep(1)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#EE0000] font-['Roboto'] disabled:opacity-50 disabled:cursor-not-allowed">
                Sử dụng email khác
              </button>
            </div>
            </form>
          </div>}

          {step === 3 && (
            <form onSubmit={handleResetSubmit} className="space-y-5" aria-busy={resetting}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-['Open_Sans']">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={resetting} className="w-full py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 focus:border-[#EE0000] disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Nhập mật khẩu mới" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={resetting} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 disabled:opacity-50">
                    {showPassword ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 font-['Open_Sans']">
                  Xác nhận mật khẩu
                </label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={resetting} className="w-full py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 focus:border-[#EE0000] disabled:opacity-60 disabled:cursor-not-allowed" placeholder="Xác nhận mật khẩu mới" required />
              </div>

              {message && <p className="text-green-600 text-sm text-center font-['Roboto']">{message}</p>}
              {error && <p className="text-red-600 text-sm text-center font-['Roboto']">{error}</p>}

              <button type="submit" disabled={resetting} className="w-full py-3 bg-[#EE0000] text-white rounded-md font-bold text-sm tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {resetting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
              </button>

              <div className="text-center">
                <Link to="/login" tabIndex={resetting ? -1 : undefined} className={`text-sm text-gray-600 dark:text-gray-400 hover:text-[#EE0000] font-['Roboto'] ${resetting ? 'pointer-events-none opacity-50' : ''}`}>
                  Đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>;
}