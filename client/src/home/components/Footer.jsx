import React from 'react';
import { Link } from 'react-router-dom';
const findmeLogo = '/logo.png';
const Footer = () => {
  const year = new Date().getFullYear();
  const FooterLink = ({
    to,
    children
  }) => <Link to={to} className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors font-['Roboto']">
      {children}
    </Link>;
  const FooterTitle = ({
    children
  }) => <h3 className="text-gray-900 dark:text-white font-semibold font-['Open_Sans'] tracking-wide transition-colors duration-300">
      {children}
    </h3>;
  return <footer className="px-6 py-10 bg-white dark:bg-gray-900 border-t border-red-100 dark:border-red-900/60 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img src={findmeLogo} alt="findme" className="w-9 h-9" />
              <span className="text-3xl font-bold tracking-wide text-red-600 dark:text-red-400 font-['Open_Sans']">FINDME</span>
            </div>
            <p className="mt-2 text-sm font-semibold tracking-wide uppercase text-gray-800 dark:text-gray-200 font-['Open_Sans']">
              Nền tảng tuyển dụng nội bộ doanh nghiệp
            </p>
            <a href="mailto:tuyendung@findme.com.vn" className="mt-4 inline-block text-sm underline text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-['Roboto']">
              tuyendung@findme.com.vn
            </a>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 font-['Roboto'] leading-relaxed">
              Lô D26 Khu đô thị mới Cầu Giấy, Phường Cầu Giấy, Hà Nội, Việt Nam
            </p>
          </div>

          <div className="md:pt-14">
            <FooterTitle>Điều hướng</FooterTitle>
            <ul className="mt-3 space-y-2">
              <li><FooterLink to="/">Trang chủ</FooterLink></li>
              <li><FooterLink to="/jobs">Tuyển dụng</FooterLink></li>
              <li><FooterLink to="/login">Đăng nhập nhân viên</FooterLink></li>
            </ul>
          </div>

          <div className="md:pt-14">
            <FooterTitle>Theo dõi chúng tôi</FooterTitle>
            <div className="mt-3 flex items-center gap-3">
              <a href="#" aria-label="Facebook" className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-200 dark:border-red-900 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5 9H16V6h-2.5C11.57 6 10 7.57 10 9.5V12H8v3h2v6h3v-6h2.25l.75-3H13v-2.5c0-.28.22-.5.5-.5Z" /></svg>
              </a>
              <a href="#" aria-label="YouTube" className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-200 dark:border-red-900 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21.8 8.001a2.95 2.95 0 0 0-2.077-2.088C17.867 5.4 12 5.4 12 5.4s-5.867 0-7.723.513A2.95 2.95 0 0 0 2.2 8.001 30.2 30.2 0 0 0 1.8 12c0 1.34.133 2.675.4 3.999a2.95 2.95 0 0 0 2.077 2.088C6.133 18.6 12 18.6 12 18.6s5.867 0 7.723-.513a2.95 2.95 0 0 0 2.077-2.088c.267-1.324.4-2.659.4-3.999 0-1.34-.133-2.675-.4-3.999ZM10 14.6V9.4L15 12l-5 2.6Z" /></svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-200 dark:border-red-900 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.94 8.5a1.78 1.78 0 1 1 0-3.56 1.78 1.78 0 0 1 0 3.56ZM5.5 9.9h2.88V19H5.5V9.9Zm4.68 0h2.76v1.24h.04c.38-.73 1.31-1.5 2.69-1.5 2.88 0 3.41 1.9 3.41 4.37V19h-2.88v-4.43c0-1.06-.02-2.42-1.47-2.42-1.48 0-1.7 1.15-1.7 2.34V19h-2.85V9.9Z" /></svg>
              </a>
              <a href="#" aria-label="Instagram" className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-red-200 dark:border-red-900 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5ZM12 7.3A4.7 4.7 0 1 1 7.3 12 4.7 4.7 0 0 1 12 7.3Zm0 1.8A2.9 2.9 0 1 0 14.9 12 2.9 2.9 0 0 0 12 9.1Zm4.95-2.1a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1Z" /></svg>
              </a>
            </div>
            <div className="mt-4">
              <img src="/notification.png" alt="Đã thông báo Bộ Công Thương" className="h-auto w-full max-w-[160px] object-contain" />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-red-100 dark:border-red-900/60 text-sm text-gray-500 dark:text-gray-400 font-['Roboto']">
          © VIETTEL {year} | FINDME | CHÍNH SÁCH BẢO MẬT | ĐIỀU KHOẢN SỬ DỤNG
        </div>
      </div>
    </footer>;
};
export default Footer;