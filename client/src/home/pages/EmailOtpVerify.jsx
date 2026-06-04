import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../utils/api';
const pad = n => n.toString().padStart(2, '0');
export default function EmailOtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || '';
  const initialUserId = location.state?.userId || '';
  const hasSentInitialOtp = useRef(false);
  const lastAutoVerifiedRef = useRef('');
  const [email, setEmail] = useState(initialEmail);
  const [userId] = useState(initialUserId);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const codeString = useMemo(() => code.join(''), [code]);
  const busy = sending || verifying;
  useEffect(() => {
    if (!initialEmail && !initialUserId) {
      setError('Thiếu thông tin xác minh. Vui lòng đăng ký lại.');
      return;
    }
    if (!hasSentInitialOtp.current) {
      hasSentInitialOtp.current = true;
      sendCode();
    }
  }, []);
  useEffect(() => {
    let t;
    if (cooldown > 0) {
      t = setInterval(() => setCooldown(s => s > 0 ? s - 1 : 0), 1000);
    }
    return () => clearInterval(t);
  }, [cooldown]);
  useEffect(() => {
    if (verifying) return;
    if (busy) return;
    if (codeString.length !== 6) return;
    if (!/^\d{6}$/.test(codeString)) return;
    if (lastAutoVerifiedRef.current === codeString) return;
    lastAutoVerifiedRef.current = codeString;
    verify();
  }, [codeString]);
  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[idx] = val;
    setCode(next);
    setError('');
    setMessage('');
    if (val && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`);
      if (el) el.focus();
    }
  };
  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      e.preventDefault();
      const prev = [...code];
      prev[idx - 1] = '';
      setCode(prev);
      const el = document.getElementById(`otp-${idx - 1}`);
      if (el) el.focus();
    }
  };
  const handlePaste = (idx, e) => {
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
    const el = document.getElementById(`otp-${focusIdx}`);
    if (el) el.focus();
  };
  const sendCode = async () => {
    if (!email && !userId) return;
    setSending(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(buildApiUrl('/api/auth/otp/send'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          userId
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Gửi mã thất bại');
        return;
      }
      setMessage('Mã xác minh đã được gửi tới email của bạn');
      if (data.data?.resendCooldownSec) setCooldown(data.data.resendCooldownSec);
    } catch (e) {
      setError('Lỗi mạng khi gửi mã');
    } finally {
      setSending(false);
    }
  };
  const verify = async () => {
    if (codeString.length !== 6) {
      setError('Vui lòng nhập mã 6 chữ số');
      return;
    }
    setVerifying(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(buildApiUrl('/api/auth/otp/verify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          userId,
          code: codeString
        })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Mã không hợp lệ');
        return;
      }
      setMessage('Xác minh email thành công. Đang chuyển tới trang đăng nhập...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (e) {
      setError('Lỗi mạng khi xác minh mã');
    } finally {
      setVerifying(false);
    }
  };
  const mmss = useMemo(() => `${pad(Math.floor(cooldown / 60))}:${pad(cooldown % 60)}`, [cooldown]);
  return <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6" aria-busy={busy}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Xác minh email</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Chúng tôi đã gửi mã 6 chữ số tới {email || 'email của bạn'}
          </p>
        </div>

        <div className="flex justify-center space-x-2">
          {code.map((v, i) => <input key={i} id={`otp-${i}`} inputMode="numeric" maxLength={1} value={v} disabled={busy} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} onPaste={e => handlePaste(i, e)} className="w-12 h-12 text-center text-xl rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 focus:border-[#EE0000] disabled:opacity-60 disabled:cursor-not-allowed" />)}
        </div>

        {message && <p className="text-green-600 text-sm text-center">{message}</p>}
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button type="button" onClick={verify} disabled={busy || codeString.length !== 6} className="w-full bg-[#EE0000] text-white py-3 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {verifying ? 'Đang xác minh...' : sending ? 'Đang gửi mã...' : 'Xác minh'}
        </button>

        <div className="text-center text-sm text-gray-600 dark:text-gray-300">
          Không nhận được mã?{' '}
          <button type="button" disabled={cooldown > 0 || busy} onClick={sendCode} className="underline hover:text-[#EE0000] disabled:no-underline disabled:opacity-50">
            {cooldown > 0 ? `Gửi lại sau ${mmss}` : 'Gửi lại mã'}
          </button>
        </div>
      </div>
    </div>;
}