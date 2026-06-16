import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Bell, MessageSquare, ChevronDown, User } from 'lucide-react';
const findmeLogo = '/logo.png';
import ThemeToggle from '../../components/common/ThemeToggle';
import NotificationDropdown from '../../components/notifications/NotificationDropdown';

const HOME_SECTION_TRANG_CHU = 'trang-chu';
const HOME_SECTION_NOI_LAM_VIEC = 'noi-lam-viec-ban-dang-tim-kiem';
const HOME_SECTION_DAI_NGO = 'bien-giac-mo-thanh-hien-thuc';
const HOME_SECTION_SU_KIEN = 'su-kien';
const HEADER_SCROLL_OFFSET = 96;
const getHomeNavActiveKey = () => {
  return null;
};
const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const [navActive, setNavActive] = useState(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    if (path.startsWith('/jobs')) return 'jobs';
    if (path.startsWith('/companies')) return 'companies';
    if (path.startsWith('/applicant/applications')) return 'applications';
    if (path.startsWith('/saved-jobs') || path.startsWith('/applicant/saved-jobs')) return 'saved-jobs';
    return null;
  });
  const location = useLocation();
  useLayoutEffect(() => {
    if (location.pathname !== '/') {
      const path = location.pathname;
      if (path.startsWith('/jobs')) setNavActive('jobs');
      else if (path.startsWith('/companies')) setNavActive('companies');
      else if (path.startsWith('/applicant/applications')) setNavActive('applications');
      else if (path.startsWith('/saved-jobs') || path.startsWith('/applicant/saved-jobs')) setNavActive('saved-jobs');
      else setNavActive(null);
      return;
    }
    setNavActive(getHomeNavActiveKey());
  }, [location.pathname]);
  useEffect(() => {
    if (location.pathname !== '/') return;
    const tick = () => setNavActive(getHomeNavActiveKey());
    window.addEventListener('scroll', tick, {
      passive: true
    });
    window.addEventListener('resize', tick);
    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
    };
  }, [location.pathname]);
  const navDesktopClass = key => `transition-colors font-['Open_Sans'] ${navActive === key ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200 opacity-90 hover:text-red-600 dark:hover:text-red-400'}`;
  const navMobileClass = key => `block px-3 py-2 rounded-lg font-['Open_Sans'] transition-colors ${navActive === key ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold' : 'text-gray-800 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300'}`;
  const scrollToTrangChu = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_TRANG_CHU)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const scrollToNoiLamViec = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_NOI_LAM_VIEC)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const scrollToDaiNgo = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_DAI_NGO)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  const scrollToSuKien = () => {
    if (location.pathname === '/') {
      document.getElementById(HOME_SECTION_SU_KIEN)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  return <header className="fixed inset-x-0 top-0 z-50 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 grid grid-cols-2 md:grid-cols-[auto_1fr_auto] items-center gap-4">
          {}
          <div className="flex items-center">
            <Link to="/jobs" onClick={scrollToNoiLamViec} className="flex items-center gap-2">
              <span className="text-2xl font-black text-red-600 dark:text-red-400 font-['Open_Sans'] transition-colors duration-300">FINDME</span>
            </Link>
          </div>

          {}
          <nav className="hidden md:flex justify-start flex-1 ml-8">
            <div className="flex items-center gap-6 text-sm font-semibold font-['Open_Sans']">
              <Link to="/jobs" className={navDesktopClass('jobs')} aria-current={navActive === 'jobs' ? 'page' : undefined}>
                Việc làm
              </Link>
              <Link to="/companies" className={navDesktopClass('companies')}>
                Công ty
              </Link>
              <Link to="/applicant/applications" className={navDesktopClass('applications')}>
                Đơn ứng tuyển
              </Link>
              <Link to="/saved-jobs" className={navDesktopClass('saved-jobs')}>
                Việc làm đã lưu
              </Link>
            </div>
          </nav>

          {}
          <div className="flex items-center justify-end gap-4">
            {/* Recruiter Link */}
            <div className="hidden lg:flex flex-col items-end leading-tight mr-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Bạn là nhà tuyển dụng?</span>
              <Link to="/tuyen-dung" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-0.5">
                Đăng tuyển ngay <span className="font-normal">&raquo;</span>
              </Link>
            </div>

            {/* Separator */}
            <div className="hidden lg:block h-8 w-px bg-gray-200 dark:bg-gray-700"></div>

            <div className="hidden md:flex items-center gap-3">
             
              {user ? (
                <div className="flex items-center gap-3">
                  {/* Notifications Bell with Dropdown */}
                  <NotificationDropdown />

                  

                  {/* Avatar with Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsProfileDropdownOpen(prev => !prev)}
                      className="flex items-center gap-1 focus:outline-none py-1"
                    >
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 ring-1 ring-border flex items-center justify-center">
                        {user.profilePicture || user.avatar ? (
                          <img src={user.profilePicture || user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                        )}
                      </div>
                   
                    </button>

                    {/* Dropdown Menu */}
                    <div className={`absolute right-0 mt-1.5 w-56 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 py-1 transition-all z-50 ${isProfileDropdownOpen ? 'block' : 'hidden'}`}>
                      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {user.lastName ? `${user.lastName} ${user.firstName}` : 'Người dùng'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <Link to="/profile" onClick={() => setIsProfileDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Thông tin cá nhân
                      </Link>
                      <Link to="/resumes" onClick={() => setIsProfileDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        CV của tôi
                      </Link>
                      <Link to="/applicant/applications" onClick={() => setIsProfileDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Hồ sơ ứng tuyển
                      </Link>
                      <Link to="/change-password" onClick={() => setIsProfileDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Đổi mật khẩu
                      </Link>
                      <button onClick={() => { setIsProfileDropdownOpen(false); logout(); navigate('/login'); }} className="w-full text-left block px-4 py-2.5 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" state={{ from: location }} className="px-5 py-2 rounded-full border border-red-600 text-red-600 bg-transparent text-xs font-bold tracking-wide hover:bg-red-50 transition-colors font-['Open_Sans']">
                    ĐĂNG NHẬP
                  </Link>
                  <Link to="/register" className="px-5 py-2 rounded-full border border-red-600 bg-red-600 text-xs font-bold tracking-wide text-white hover:bg-red-700 hover:border-red-700 transition-colors font-['Open_Sans']">
                    ĐĂNG KÝ
                  </Link>
                </div>
              )}
            </div>

            <button className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-white/30 bg-black/20 transition-colors duration-300" onClick={() => setIsMobileMenuOpen(v => !v)} aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={isMobileMenuOpen} aria-controls="mobile-menu">
              <svg className="w-6 h-6 text-red-700 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {}
      {isMobileMenuOpen && <div id="mobile-menu" className="md:hidden border-t border-white/20 bg-black/40 backdrop-blur-md transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-4">
            <nav className="space-y-2">
              <Link to="/jobs" onClick={() => setIsMobileMenuOpen(false)} className={navMobileClass('jobs')}>
                Việc làm
              </Link>
              <Link to="/companies" onClick={() => setIsMobileMenuOpen(false)} className={navMobileClass('companies')}>
                Công ty
              </Link>
              <Link to="/applicant/applications" onClick={() => setIsMobileMenuOpen(false)} className={navMobileClass('applications')}>
                Đơn ứng tuyển
              </Link>
              <Link to="/saved-jobs" onClick={() => setIsMobileMenuOpen(false)} className={navMobileClass('saved-jobs')}>
                Việc làm đã lưu
              </Link>
            </nav>
            <div className="pt-4 border-t border-red-100 dark:border-red-900/60 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <Link to="/login" state={{ from: location }} onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-['Open_Sans'] text-center font-semibold">
                  ĐĂNG NHẬP
                </Link>
              </div>
            </div>
          </div>
        </div>}
    </header>;
};
export default Navbar;